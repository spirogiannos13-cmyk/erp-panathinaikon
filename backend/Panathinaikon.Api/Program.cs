using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Panathinaikon.Api;

var builder=WebApplication.CreateBuilder(args);
var connection=builder.Configuration.GetConnectionString("DefaultConnection") ?? Environment.GetEnvironmentVariable("PANATHINAIKON_DB") ?? "";
if(string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("Configure ConnectionStrings__DefaultConnection or PANATHINAIKON_DB.");
var jwtKey=builder.Configuration["Jwt:SigningKey"] ?? Environment.GetEnvironmentVariable("PANATHINAIKON_JWT_KEY");
if(string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey)<32) throw new InvalidOperationException("Configure Jwt__SigningKey with at least 32 bytes.");
builder.Services.AddDbContext<AppDbContext>(o=>o.UseSqlServer(connection));
builder.Services.AddScoped<IPasswordHasher<UserAccount>,PasswordHasher<UserAccount>>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o=>o.TokenValidationParameters=new TokenValidationParameters { ValidateIssuer=true,ValidIssuer=builder.Configuration["Jwt:Issuer"],ValidateAudience=true,ValidAudience=builder.Configuration["Jwt:Audience"],ValidateIssuerSigningKey=true,IssuerSigningKey=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),ValidateLifetime=true,ClockSkew=TimeSpan.FromSeconds(30) });
builder.Services.AddAuthorization(); builder.Services.AddEndpointsApiExplorer(); builder.Services.AddSwaggerGen();
builder.Services.AddCors(o=>o.AddPolicy("frontend",p=>p.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5500","http://127.0.0.1:5500"]).AllowAnyHeader().AllowAnyMethod()));
var app=builder.Build(); app.UseCors("frontend"); app.UseAuthentication(); app.UseAuthorization();
if(app.Environment.IsDevelopment()){app.UseSwagger();app.UseSwaggerUI();}
app.MapGet("/api/health",()=>Results.Ok(new{status="ok",service="Panathinaikon.Api"}));
app.MapPost("/api/auth/bootstrap",async(BootstrapRequest q,AppDbContext db,IPasswordHasher<UserAccount> hasher,IConfiguration cfg)=>{
 if(!cfg.GetValue<bool>("Bootstrap:Enabled"))return Results.NotFound();
 if(await db.Users.AnyAsync())return Results.Conflict(new{message="Bootstrap has already been completed."});
 if(string.IsNullOrWhiteSpace(q.StoreName)||string.IsNullOrWhiteSpace(q.Username)||string.IsNullOrWhiteSpace(q.DisplayName)||q.Password.Length<12)return Results.BadRequest(new{message="Store, username, display name and password (12+ chars) are required."});
 var store=new Store{Name=q.StoreName.Trim(),Code="MAIN"};db.Stores.Add(store);await db.SaveChangesAsync();
 var user=new UserAccount{StoreId=store.Id,Username=q.Username.Trim(),DisplayName=q.DisplayName.Trim(),Role="Admin"};user.PasswordHash=hasher.HashPassword(user,q.Password);db.Users.Add(user);db.Tables.AddRange(Enumerable.Range(1,12).Select(i=>new DiningTable{StoreId=store.Id,Name=$"Τραπέζι {i:00}",Capacity=i%3==0?4:2}));db.Categories.AddRange(new[]{"Καφέδες","Φαγητό","Σαλάτες","Sides","Αναψυκτικά"}.Select(name=>new ItemCategory{StoreId=store.Id,Name=name}));await db.SaveChangesAsync();
 return Results.Created("/api/health",new{message="Administrator created. Disable Bootstrap:Enabled now."});
}).AllowAnonymous();
app.MapPost("/api/auth/login",async(LoginRequest q,AppDbContext db,IPasswordHasher<UserAccount> hasher,IConfiguration cfg)=>{
 var user=await db.Users.Include(x=>x.Store).SingleOrDefaultAsync(x=>x.Username==q.Username.Trim()&&x.IsActive&&x.Store!.IsActive);
 if(user is null||hasher.VerifyHashedPassword(user,user.PasswordHash,q.Password)==PasswordVerificationResult.Failed)return Results.Unauthorized();
 var key=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:SigningKey"]!));var minutes=Math.Clamp(cfg.GetValue("Jwt:ExpiresMinutes",60),5,480);
 var claims=new[]{new Claim(ClaimTypes.NameIdentifier,user.Id.ToString()),new Claim(ClaimTypes.Name,user.Username),new Claim(ClaimTypes.Role,user.Role),new Claim("store_id",user.StoreId.ToString())};
 var token=new JwtSecurityToken(cfg["Jwt:Issuer"],cfg["Jwt:Audience"],claims,expires:DateTime.UtcNow.AddMinutes(minutes),signingCredentials:new SigningCredentials(key,SecurityAlgorithms.HmacSha256));
 return Results.Ok(new{accessToken=new JwtSecurityTokenHandler().WriteToken(token),tokenType="Bearer",expiresIn=minutes*60,user=new{user.Id,user.Username,user.DisplayName,user.Role,user.StoreId,storeName=user.Store!.Name}});
}).AllowAnonymous();
var api=app.MapGroup("/api").RequireAuthorization();
api.MapGet("/stores/current",async(ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);return await db.Stores.Where(x=>x.Id==sid).Select(x=>new{x.Id,x.Name,x.Code}).SingleAsync();});

api.MapPost("/categories",async(CreateCategoryRequest q,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);var name=q.Name.Trim();if(string.IsNullOrWhiteSpace(name))return Results.BadRequest();var category=await db.Categories.SingleOrDefaultAsync(x=>x.StoreId==sid&&x.Name==name);if(category is null){category=new ItemCategory{StoreId=sid,Name=name};db.Categories.Add(category);await db.SaveChangesAsync();}return Results.Ok(new{category.Id,category.Name});});
api.MapGet("/categories",async(ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);return await db.Categories.AsNoTracking().Where(x=>x.StoreId==sid).OrderBy(x=>x.Name).Select(x=>new{x.Id,x.Name}).ToListAsync();});
api.MapPut("/items/{id:int}",async(int id,CreateItemRequest q,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);if(string.IsNullOrWhiteSpace(q.Name)||q.Price<0)return Results.BadRequest();var item=await db.SaleItems.SingleOrDefaultAsync(x=>x.Id==id&&x.StoreId==sid);if(item is null)return Results.NotFound();if(q.CategoryId.HasValue&&!await db.Categories.AnyAsync(x=>x.Id==q.CategoryId&&x.StoreId==sid))return Results.BadRequest(new{message="Invalid category."});item.Name=q.Name.Trim();item.Price=q.Price;item.CategoryId=q.CategoryId;item.UpdatedAtUtc=DateTime.UtcNow;await db.SaveChangesAsync();return Results.Ok(new{item.Id,item.Code,item.Name,item.Price,item.CategoryId});});
api.MapDelete("/items/{id:int}",async(int id,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);var item=await db.SaleItems.SingleOrDefaultAsync(x=>x.Id==id&&x.StoreId==sid);if(item is null)return Results.NotFound();item.IsActive=false;await db.SaveChangesAsync();return Results.NoContent();});
api.MapGet("/items",async(ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);return await db.SaleItems.AsNoTracking().Where(x=>x.StoreId==sid&&x.IsActive).OrderBy(x=>x.Name).Select(x=>new{x.Id,x.Code,x.Name,x.Price,x.CategoryId,CategoryName=x.Category==null?null:x.Category.Name}).ToListAsync();});
api.MapPost("/items",async(CreateItemRequest q,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);if(string.IsNullOrWhiteSpace(q.Name)||q.Price<0)return Results.BadRequest();var item=new SaleItem{StoreId=sid,Code=string.IsNullOrWhiteSpace(q.Code)?Guid.NewGuid().ToString("N")[..12]:q.Code.Trim(),Name=q.Name.Trim(),Price=q.Price,CategoryId=q.CategoryId};db.SaleItems.Add(item);await db.SaveChangesAsync();return Results.Created($"/api/items/{item.Id}",new{item.Id,item.Code,item.Name,item.Price});});
api.MapGet("/tables",async(ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);return await db.Tables.AsNoTracking().Where(x=>x.StoreId==sid&&x.IsActive).OrderBy(x=>x.Name).Select(x=>new{x.Id,x.Name,x.Capacity,x.Status}).ToListAsync();});

api.MapPost("/inventory",async(CreateStockItemRequest q,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);if(string.IsNullOrWhiteSpace(q.Name)||string.IsNullOrWhiteSpace(q.Unit)||q.Quantity<0||q.MinimumQuantity<0||q.UnitCost<0)return Results.BadRequest();var item=new StockItem{StoreId=sid,Code=string.IsNullOrWhiteSpace(q.Code)?Guid.NewGuid().ToString("N")[..12]:q.Code.Trim(),Name=q.Name.Trim(),Category=q.Category?.Trim()??"",Unit=q.Unit.Trim(),Quantity=q.Quantity,MinimumQuantity=q.MinimumQuantity,UnitCost=q.UnitCost};db.StockItems.Add(item);await db.SaveChangesAsync();if(q.Quantity>0)db.StockMovements.Add(new StockMovement{StoreId=sid,StockItemId=item.Id,QuantityDelta=q.Quantity,MovementType="Initial",Reference="Αρχικό απόθεμα"});await db.SaveChangesAsync();return Results.Created($"/api/inventory/{item.Id}",new{item.Id,item.Code,item.Name,item.Category,item.Unit,item.Quantity,item.MinimumQuantity,item.UnitCost});});
api.MapPut("/inventory/{id:int}",async(int id,UpdateStockItemRequest q,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);if(string.IsNullOrWhiteSpace(q.Name)||string.IsNullOrWhiteSpace(q.Unit)||q.MinimumQuantity<0||q.UnitCost<0)return Results.BadRequest();var item=await db.StockItems.SingleOrDefaultAsync(x=>x.Id==id&&x.StoreId==sid&&x.IsActive);if(item is null)return Results.NotFound();item.Name=q.Name.Trim();item.Category=q.Category?.Trim()??"";item.Unit=q.Unit.Trim();item.MinimumQuantity=q.MinimumQuantity;item.UnitCost=q.UnitCost;await db.SaveChangesAsync();return Results.Ok(new{item.Id,item.Code,item.Name,item.Category,item.Unit,item.Quantity,item.MinimumQuantity,item.UnitCost});});
api.MapPost("/inventory/{id:int}/movements",async(int id,StockMovementRequest q,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);if(q.QuantityDelta==0||string.IsNullOrWhiteSpace(q.MovementType))return Results.BadRequest();var item=await db.StockItems.SingleOrDefaultAsync(x=>x.Id==id&&x.StoreId==sid&&x.IsActive);if(item is null)return Results.NotFound();var updated=item.Quantity+q.QuantityDelta;if(updated<0)return Results.Conflict(new{message="Δεν υπάρχει επαρκές απόθεμα."});await using var tx=await db.Database.BeginTransactionAsync();item.Quantity=updated;db.StockMovements.Add(new StockMovement{StoreId=sid,StockItemId=id,QuantityDelta=q.QuantityDelta,MovementType=q.MovementType.Trim(),Reference=q.Reference?.Trim()});await db.SaveChangesAsync();await tx.CommitAsync();return Results.Ok(new{item.Id,item.Quantity});});
api.MapGet("/inventory/{id:int}/movements",async Task<IResult> (int id,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);if(!await db.StockItems.AnyAsync(x=>x.Id==id&&x.StoreId==sid))return Results.NotFound();var movements=await db.StockMovements.AsNoTracking().Where(x=>x.StoreId==sid&&x.StockItemId==id).OrderByDescending(x=>x.CreatedAtUtc).Take(100).Select(x=>new{x.Id,x.QuantityDelta,x.MovementType,x.Reference,x.CreatedAtUtc}).ToListAsync();return Results.Ok(movements);});
api.MapDelete("/inventory/{id:int}",async(int id,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);var item=await db.StockItems.SingleOrDefaultAsync(x=>x.Id==id&&x.StoreId==sid);if(item is null)return Results.NotFound();if(await db.RecipeIngredients.AnyAsync(x=>x.StockItemId==id))return Results.Conflict(new{message="Το υλικό χρησιμοποιείται σε συνταγή και δεν μπορεί να απενεργοποιηθεί."});item.IsActive=false;await db.SaveChangesAsync();return Results.NoContent();});
api.MapPost("/recipes",async(RecipeRequest q,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);if(q.SaleItemId<=0||q.SalePriceSnapshot<0||q.Ingredients is null||q.Ingredients.Count==0||q.Ingredients.Any(x=>x.Quantity<=0||x.UnitCost<0))return Results.BadRequest();if(!await db.SaleItems.AnyAsync(x=>x.Id==q.SaleItemId&&x.StoreId==sid&&x.IsActive))return Results.BadRequest();var ids=q.Ingredients.Select(x=>x.StockItemId).Distinct().ToArray();if(await db.StockItems.CountAsync(x=>x.StoreId==sid&&x.IsActive&&ids.Contains(x.Id))!=ids.Length)return Results.BadRequest();var recipe=await db.Recipes.Include(x=>x.Ingredients).SingleOrDefaultAsync(x=>x.StoreId==sid&&x.SaleItemId==q.SaleItemId);if(recipe is null){recipe=new Recipe{StoreId=sid,SaleItemId=q.SaleItemId};db.Recipes.Add(recipe);}recipe.SalePriceSnapshot=q.SalePriceSnapshot;recipe.IsActive=true;recipe.Ingredients.Clear();foreach(var line in q.Ingredients){var stock=await db.StockItems.SingleAsync(x=>x.Id==line.StockItemId&&x.StoreId==sid);stock.UnitCost=line.UnitCost;recipe.Ingredients.Add(new RecipeIngredient{StockItemId=line.StockItemId,Quantity=line.Quantity});}await db.SaveChangesAsync();return Results.Ok(new{recipe.Id,recipe.SaleItemId,recipe.SalePriceSnapshot});});
api.MapDelete("/recipes/{id:int}",async(int id,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);var recipe=await db.Recipes.SingleOrDefaultAsync(x=>x.Id==id&&x.StoreId==sid);if(recipe is null)return Results.NotFound();recipe.IsActive=false;await db.SaveChangesAsync();return Results.NoContent();});

api.MapGet("/inventory",async(ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);return await db.StockItems.AsNoTracking().Where(x=>x.StoreId==sid&&x.IsActive).OrderBy(x=>x.Name).Select(x=>new{x.Id,x.Code,x.Name,x.Category,x.Unit,x.Quantity,x.MinimumQuantity,x.UnitCost}).ToListAsync();});
api.MapGet("/recipes",async(ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);var rows=await db.Recipes.AsNoTracking().Where(x=>x.StoreId==sid&&x.IsActive).Include(x=>x.Ingredients).OrderBy(x=>x.Id).ToListAsync();var saleIds=rows.Select(x=>x.SaleItemId).Distinct().ToArray();var stockIds=rows.SelectMany(x=>x.Ingredients).Select(x=>x.StockItemId).Distinct().ToArray();var names=await db.SaleItems.Where(x=>x.StoreId==sid&&saleIds.Contains(x.Id)).ToDictionaryAsync(x=>x.Id,x=>x.Name);var stock=await db.StockItems.Where(x=>x.StoreId==sid&&stockIds.Contains(x.Id)).ToDictionaryAsync(x=>x.Id);return rows.Select(x=>new{x.Id,x.SaleItemId,ItemName=names.GetValueOrDefault(x.SaleItemId),x.SalePriceSnapshot,Ingredients=x.Ingredients.Select(i=>new{i.StockItemId,StockName=stock.GetValueOrDefault(i.StockItemId)!.Name,Unit=stock.GetValueOrDefault(i.StockItemId)!.Unit,UnitCost=stock.GetValueOrDefault(i.StockItemId)!.UnitCost,i.Quantity})});});
api.MapGet("/orders",async(ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);return await db.Orders.AsNoTracking().Where(x=>x.StoreId==sid).OrderByDescending(x=>x.CreatedAtUtc).Select(x=>new{x.Id,x.OrderNumber,x.Channel,x.Status,x.Subtotal,x.DiscountAmount,x.Total,x.CreatedAtUtc,x.ClosedAtUtc,CustomerName=x.Customer==null?null:x.Customer.Name,Phone=x.Customer==null?null:x.Customer.Phone,Address=x.Customer==null?null:x.Customer.Address,PaidAmount=db.OrderPayments.Where(p=>p.StoreId==sid&&p.SalesOrderId==x.Id).Sum(p=>(decimal?)p.Amount)??0m}).Take(100).ToListAsync();});

api.MapGet("/orders/{id:int}",async(int id,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);var order=await db.Orders.AsNoTracking().Include(x=>x.Customer).Include(x=>x.Lines).Where(x=>x.Id==id&&x.StoreId==sid).Select(x=>new{x.Id,x.OrderNumber,x.Channel,x.Status,x.Subtotal,x.DiscountAmount,x.Total,x.Notes,x.CreatedAtUtc,Customer=x.Customer==null?null:new{x.Customer.Name,x.Customer.Phone,x.Customer.Address},Lines=x.Lines.Select(l=>new{l.Id,l.SaleItemId,l.ItemNameSnapshot,l.UnitPrice,l.Quantity,l.LineTotal})}).SingleOrDefaultAsync();return order is null?Results.NotFound():Results.Ok(order);});
api.MapPost("/orders",async(CreateOrderRequest q,ClaimsPrincipal u,AppDbContext db)=>{
 var sid=int.Parse(u.FindFirstValue("store_id")!);
 if(q.Lines is null||q.Lines.Count==0||q.Lines.Any(x=>x.Quantity<=0)||!new[]{"Table","TakeAway","Delivery"}.Contains(q.Channel))return Results.BadRequest(new{message="A valid channel and at least one positive order line are required."});
 if(q.Channel=="Table"&&!q.TableId.HasValue)return Results.BadRequest(new{message="A table is required for table orders."});
 if(q.Channel=="Delivery"&&(string.IsNullOrWhiteSpace(q.Phone)||string.IsNullOrWhiteSpace(q.Address)))return Results.BadRequest(new{message="Phone and delivery address are required."});
 await using var tx=await db.Database.BeginTransactionAsync();
 DiningTable? table=null;
 if(q.TableId.HasValue){table=await db.Tables.SingleOrDefaultAsync(x=>x.Id==q.TableId.Value&&x.StoreId==sid&&x.IsActive);if(table is null)return Results.BadRequest(new{message="The selected table does not exist."});if(table.Status=="Occupied")return Results.Conflict(new{message="The selected table already has an open order."});}
 var ids=q.Lines.Select(x=>x.SaleItemId).Distinct().ToArray();
 var items=await db.SaleItems.Where(x=>x.StoreId==sid&&x.IsActive&&ids.Contains(x.Id)).ToDictionaryAsync(x=>x.Id);
 if(items.Count!=ids.Length)return Results.BadRequest(new{message="One or more items are unavailable."});
 Customer? customer=null;
 if(!string.IsNullOrWhiteSpace(q.Phone)){customer=await db.Customers.FirstOrDefaultAsync(x=>x.StoreId==sid&&x.Phone==q.Phone.Trim());}
 if(customer is null&&!string.IsNullOrWhiteSpace(q.CustomerName)){customer=new Customer{StoreId=sid,Name=q.CustomerName.Trim(),Phone=string.IsNullOrWhiteSpace(q.Phone)?null:q.Phone.Trim(),Address=string.IsNullOrWhiteSpace(q.Address)?null:q.Address.Trim()};db.Customers.Add(customer);}
 else if(customer is not null){if(!string.IsNullOrWhiteSpace(q.CustomerName))customer.Name=q.CustomerName.Trim();if(!string.IsNullOrWhiteSpace(q.Address))customer.Address=q.Address.Trim();}
 if(customer is not null)await db.SaveChangesAsync();
 var lines=q.Lines.Select(x=>{var item=items[x.SaleItemId];var unit=decimal.Round(item.Price,2);return new SalesOrderLine{SaleItemId=item.Id,ItemNameSnapshot=item.Name,UnitPrice=unit,Quantity=x.Quantity,LineTotal=decimal.Round(unit*x.Quantity,2)};}).ToList();
 var subtotal=lines.Sum(x=>x.LineTotal);var discount=decimal.Round(Math.Clamp(q.DiscountAmount,0,subtotal),2);
 var order=new SalesOrder{StoreId=sid,TableId=table?.Id,CustomerId=customer?.Id,OrderNumber="PA-"+DateTime.UtcNow.ToString("yyMMddHHmmss")+"-"+Guid.NewGuid().ToString("N")[..5].ToUpperInvariant(),Channel=q.Channel,Status=q.Channel=="Delivery"?"New":"Open",Subtotal=subtotal,DiscountAmount=discount,Total=subtotal-discount,Notes=q.Notes?.Trim(),Lines=lines};
 db.Orders.Add(order);if(table is not null)table.Status="Occupied";await db.SaveChangesAsync();await tx.CommitAsync();
 return Results.Created($"/api/orders/{order.Id}",new{order.Id,order.OrderNumber,order.Channel,order.Status,order.Subtotal,order.DiscountAmount,order.Total});
});
api.MapGet("/orders/{id:int}/payments",async(int id,ClaimsPrincipal u,AppDbContext db)=>{var sid=int.Parse(u.FindFirstValue("store_id")!);if(!await db.Orders.AnyAsync(x=>x.Id==id&&x.StoreId==sid))return Results.NotFound();var rows=await db.OrderPayments.AsNoTracking().Where(x=>x.StoreId==sid&&x.SalesOrderId==id).OrderBy(x=>x.PaidAtUtc).Select(x=>new{x.Id,x.Amount,x.Method,x.Reference,x.PaidAtUtc}).ToListAsync();return Results.Ok(rows);});
api.MapPost("/orders/{id:int}/payments",async Task<IResult> (int id,CreateOrderPaymentRequest q,ClaimsPrincipal u,AppDbContext db)=>{
 var sid=int.Parse(u.FindFirstValue("store_id")!);var method=q.Method?.Trim();
 if(q.Amount<=0||method is null||!new[]{"Cash","Card","BankTransfer","Other"}.Contains(method))return Results.BadRequest(new{message="Καταχώρισε θετικό ποσό και έγκυρο τρόπο πληρωμής."});
 await using var tx=await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
 var order=await db.Orders.SingleOrDefaultAsync(x=>x.Id==id&&x.StoreId==sid);
 if(order is null)return Results.NotFound();
 if(order.Status=="Cancelled")return Results.Conflict(new{message="Δεν μπορεί να καταχωριστεί πληρωμή σε ακυρωμένη παραγγελία."});
 var paid=await db.OrderPayments.Where(x=>x.StoreId==sid&&x.SalesOrderId==id).SumAsync(x=>(decimal?)x.Amount)??0m;
 var outstanding=order.Total-paid;
 if(q.Amount>outstanding)return Results.Conflict(new{message=$"Το ποσό υπερβαίνει το υπόλοιπο ({outstanding:0.00} €)."});
 var payment=new OrderPayment{StoreId=sid,SalesOrderId=id,Amount=decimal.Round(q.Amount,2),Method=method,Reference=string.IsNullOrWhiteSpace(q.Reference)?null:q.Reference.Trim()};
 db.OrderPayments.Add(payment);await db.SaveChangesAsync();await tx.CommitAsync();
 return Results.Created($"/api/orders/{id}/payments/{payment.Id}",new{payment.Id,payment.Amount,payment.Method,payment.Reference,payment.PaidAtUtc,TotalPaid=paid+payment.Amount,Outstanding=order.Total-paid-payment.Amount});
});
api.MapPatch("/orders/{id:int}/status",async Task<IResult> (int id,UpdateOrderStatusRequest q,ClaimsPrincipal u,AppDbContext db)=>{
 var sid=int.Parse(u.FindFirstValue("store_id")!);
 await using var tx=await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
 var order=await db.Orders.Include(x=>x.Lines).SingleOrDefaultAsync(x=>x.Id==id&&x.StoreId==sid);
 if(order is null)return Results.NotFound();
 var allowed=order.Channel=="Delivery"?new[]{"New","Preparing","Ready","Dispatched","Delivered","Cancelled"}:new[]{"Open","Preparing","Closed","Cancelled"};
 if(!allowed.Contains(q.Status))return Results.BadRequest(new{message="Invalid status for this order channel."});
 if(order.Status=="Delivered"||order.Status=="Closed"||order.Status=="Cancelled")return Results.Conflict(new{message="This order is already finalized."});
 var reference="Order:"+order.Id;
 if(q.Status=="Preparing"&&order.Status!="Preparing"){
  var alreadyConsumed=await db.StockMovements.AnyAsync(x=>x.StoreId==sid&&x.Reference==reference&&x.MovementType=="OrderConsumption");
  if(!alreadyConsumed){
   var saleIds=order.Lines.Select(x=>x.SaleItemId).Distinct().ToArray();
   var recipes=await db.Recipes.AsNoTracking().Include(x=>x.Ingredients).Where(x=>x.StoreId==sid&&x.IsActive&&saleIds.Contains(x.SaleItemId)).ToListAsync();
   var requirements=order.Lines.SelectMany(line=>recipes.Where(r=>r.SaleItemId==line.SaleItemId).SelectMany(recipe=>recipe.Ingredients.Select(ingredient=>new{ingredient.StockItemId,Required=ingredient.Quantity*line.Quantity}))).GroupBy(x=>x.StockItemId).Select(g=>new{StockItemId=g.Key,Quantity=g.Sum(x=>x.Required)}).ToList();
   var stockIds=requirements.Select(x=>x.StockItemId).ToArray();
   var stock=await db.StockItems.Where(x=>x.StoreId==sid&&x.IsActive&&stockIds.Contains(x.Id)).ToDictionaryAsync(x=>x.Id);
   foreach(var requirement in requirements){
    if(!stock.TryGetValue(requirement.StockItemId,out var item))return Results.Conflict(new{message="Υλικό συνταγής δεν είναι διαθέσιμο στην αποθήκη."});
    if(item.Quantity<requirement.Quantity)return Results.Conflict(new{message=$"Δεν υπάρχει επαρκές απόθεμα για: {item.Name}. Διαθέσιμο: {item.Quantity} {item.Unit}, απαιτείται: {requirement.Quantity} {item.Unit}."});
   }
   foreach(var requirement in requirements){
    var item=stock[requirement.StockItemId];item.Quantity-=requirement.Quantity;
    db.StockMovements.Add(new StockMovement{StoreId=sid,StockItemId=item.Id,QuantityDelta=-requirement.Quantity,MovementType="OrderConsumption",Reference=reference});
   }
  }
 }
 if(q.Status=="Cancelled"){
  var consumption=await db.StockMovements.Where(x=>x.StoreId==sid&&x.Reference==reference&&x.MovementType=="OrderConsumption").ToListAsync();
  var alreadyReversed=await db.StockMovements.AnyAsync(x=>x.StoreId==sid&&x.Reference==reference&&x.MovementType=="OrderReversal");
  if(consumption.Count>0&&!alreadyReversed){
   foreach(var movement in consumption){
    var item=await db.StockItems.SingleOrDefaultAsync(x=>x.Id==movement.StockItemId&&x.StoreId==sid);
    if(item is null)return Results.Conflict(new{message="Δεν βρέθηκε υλικό για αντιλογισμό αποθέματος."});
    var restored=-movement.QuantityDelta;item.Quantity+=restored;
    db.StockMovements.Add(new StockMovement{StoreId=sid,StockItemId=item.Id,QuantityDelta=restored,MovementType="OrderReversal",Reference=reference});
   }
  }
 }
 order.Status=q.Status;
 if(q.Status is "Delivered" or "Closed" or "Cancelled")order.ClosedAtUtc=DateTime.UtcNow;
 if(order.TableId.HasValue&&(q.Status is "Closed" or "Cancelled")){var table=await db.Tables.SingleOrDefaultAsync(x=>x.Id==order.TableId&&x.StoreId==sid);if(table is not null)table.Status="Available";}
 await db.SaveChangesAsync();await tx.CommitAsync();
 return Results.Ok(new{order.Id,order.OrderNumber,order.Status,order.ClosedAtUtc});
});
app.Run();
public sealed record LoginRequest(string Username,string Password);
public sealed record BootstrapRequest(string StoreName,string Username,string DisplayName,string Password);
public sealed record CreateItemRequest(string Name,decimal Price,string? Code,int? CategoryId);
public sealed record CreateCategoryRequest(string Name);
public sealed record CreateStockItemRequest(string? Code,string Name,string? Category,string Unit,decimal Quantity,decimal MinimumQuantity,decimal UnitCost);
public sealed record UpdateStockItemRequest(string Name,string? Category,string Unit,decimal MinimumQuantity,decimal UnitCost);
public sealed record StockMovementRequest(decimal QuantityDelta,string MovementType,string? Reference);
public sealed record RecipeIngredientRequest(int StockItemId,decimal Quantity,decimal UnitCost);
public sealed record RecipeRequest(int SaleItemId,decimal SalePriceSnapshot,List<RecipeIngredientRequest> Ingredients);

public sealed record CreateOrderLineRequest(int SaleItemId,decimal Quantity);
public sealed record CreateOrderRequest(string Channel,int? TableId,string? CustomerName,string? Phone,string? Address,string? Notes,decimal DiscountAmount,List<CreateOrderLineRequest> Lines);
public sealed record UpdateOrderStatusRequest(string Status);

public sealed record CreateOrderPaymentRequest(decimal Amount,string Method,string? Reference);
