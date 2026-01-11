
# package-one_code-snippets

## Google sheet - (App Script code):

    /**
    * Handle POST requests from the React application 
    * @param {Object} e - The event object containing postData
    */
    
    function  doPost(e) {  
    try {
    
    // Connect to the specific Spreadsheet and Sheet
    
    const  ss = SpreadsheetApp.openById("1BCjqtFYoPdVS6ruWJBx9lILGrfItbEmzS8B8kAXGLh4");
    
    const  sheet = ss.getSheetByName("products");
    
    // Parse the JSON string sent from the frontend
    
    const  data = JSON.parse(e.postData.contents);
    
      
    
    // Generate a unique Product ID using timestamp
    
    const  productId = "ID-" + new  Date().getTime();
    
      
    
    // Logic to find the actual last row with data in Column B (Name)
    
    // This prevents overwriting or skipping rows due to formatting
    
    const  nameColumnValues = sheet.getRange("B:B").getValues();
    
    let  lastRowWithData = 0;
    
    for (let  i = nameColumnValues.length - 1; i >= 0; i--) {
    
    if (nameColumnValues[i][0] !== "") {
    
    lastRowWithData = i + 1;
    
    break;
    
    }
    
    }
    
    // Determine target row (starting from row 2 if sheet is empty)
    
    const  nextRow = Math.max(lastRowWithData + 1, 2);
    
      
    
    // Map data to the correct columns (A to I)
    
    const  rowValues = [[
    
    productId, // Column A: ID
    
    data.name, // Column B: Name
    
    data.price, // Column C: Price
    
    data.category, // Column D: Category
    
    data.stock, // Column E: Stock
    
    data.description, // Column F: Description
    
    data.bestSeller, // Column G: Best Seller (True/False)
    
    data.image, // Column H: Image URL
    
    new  Date() // Column I: System Timestamp
    
    ]];
    
      
    
    // Save data to sheet
    
    sheet.getRange(nextRow, 1, 1, 9).setValues(rowValues);
    
      
    
    return  ContentService.createTextOutput("Success")
    
    .setMimeType(ContentService.MimeType.TEXT);
    
      
    
    } catch (err) {
    
    return  ContentService.createTextOutput("Error: " + err.message)
    
    .setMimeType(ContentService.MimeType.TEXT);
    
    }
    
    }
    
      
    
    /**
    
    * Handle GET requests for fetching and filtering products
    
    */
    
    function  doGet(e) {
    
    try {
    
    const  ss = SpreadsheetApp.openById("1BCjqtFYoPdVS6ruWJBx9lILGrfItbEmzS8B8kAXGLh4");
    
    const  sheet = ss.getSheetByName("products");
    
    const  rows = sheet.getDataRange().getValues();
    
    const  categoryFilter = e.parameter.category;
    
    const  bestSellerFilter = e.parameter.bestSeller; // سيصل من المتصفح كـ "true"
    
      
    
    const  results = [];
    
    // Start from 1 to skip the titles
    
    for (let  i = 1; i < rows.length; i++) {
    
    const  id = rows[i][0];
    
    if (!id) continue; // Skip the empty rows
    
      
    
    const  name = rows[i][1];
    
    const  price = rows[i][2];
    
    const  category = rows[i][3];
    
    const  isBestSeller = rows[i][6]; // 'G' row
    
    const  image = rows[i][7];
    
      
    
    let  isMatch = true;
    
      
    
    // Category filtering
    
    if (categoryFilter && category !== categoryFilter) isMatch = false;
    
    // Best selling filtering
    
    // Check sheet value & request value
    
    if (bestSellerFilter === "true" && isBestSeller !== true && isBestSeller !== "TRUE") {
    
    isMatch = false;
    
    }
    
      
    
    if (isMatch) {
    
    results.push({
    
    id: id,
    
    name: name,
    
    price: price,
    
    category: category,
    
    stock: rows[i][4],
    
    description: rows[i][5],
    
    bestSeller: isBestSeller,
    
    image: image
    
    });
    
    }
    
    }
    
      
    
    return  ContentService.createTextOutput(JSON.stringify(results))
    
    .setMimeType(ContentService.MimeType.JSON);
    
    } catch (err) {
    
    return  ContentService.createTextOutput(JSON.stringify({error: err.message}))
    
    .setMimeType(ContentService.MimeType.JSON);
    
    }
    
    }
