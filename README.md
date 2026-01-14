
# package-one_code-snippets

## 📰 Google sheet - (App Script code):
```
/**
 * Handle POST requests to add new products.
 * Fixed: This version handles manual row deletions by searching for the 
 * last actual non-empty cell instead of relying on sheet.getLastRow().
 */
function doPost(e) {
  try {
    // 1. Connect to the Spreadsheet and target the 'products' sheet
    const ss = SpreadsheetApp.openById("1BCjqtFYoPdVS6ruWJBx9lILGrfItbEmzS8B8kAXGLh4");
    const sheet = ss.getSheetByName("products");
    
    // 2. Parse the incoming JSON data from the request body
    const rawContent = e.postData.contents;
    const data = JSON.parse(rawContent);

    // 3. Generate a unique ID for the product
    const productId = "ID-" + Date.now();

    // 4. FIND THE NEXT AVAILABLE ROW (Robust Method)
    // We fetch all values in Column B (Product Name) to find the actual last filled row.
    // This avoids issues where getLastRow() returns "ghost rows" after manual deletion.
    const nameColumnValues = sheet.getRange("B:B").getValues();
    let lastActiveRow = 0;
    
    // Loop backwards from the bottom to find the first cell that is not empty
    for (let i = nameColumnValues.length - 1; i >= 0; i--) {
      if (nameColumnValues[i][0] !== "" && nameColumnValues[i][0] !== undefined) {
        lastActiveRow = i + 1;
        break;
      }
    }
    
    // Determine the target row: if sheet is empty start at row 2, else next row
    const nextRow = (lastActiveRow < 1) ? 2 : lastActiveRow + 1;

    // 5. Prepare the data array to match Sheet Columns A to I
    const rowValues = [[
      productId,                // Column A: ID
      data.name || "Untitled",  // Column B: Name
      data.price || 0,          // Column C: Price
      data.category || "Uncategorized", // Column D: Category
      data.stock || 0,          // Column E: Stock
      data.description || "",   // Column F: Description
      data.bestSeller || false, // Column G: Best Seller (Boolean)
      data.image || "",         // Column H: Image URL
      new Date()                // Column I: Timestamp
    ]];

    // 6. Write the data to the sheet at the calculated next row
    sheet.getRange(nextRow, 1, 1, 9).setValues(rowValues);

    return ContentService.createTextOutput("Success")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    // Log errors in the Apps Script Execution console
    console.error("Error in doPost: " + err.message);
    return ContentService.createTextOutput("Error: " + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Handle GET requests to fetch and filter product data.
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById("1BCjqtFYoPdVS6ruWJBx9lILGrfItbEmzS8B8kAXGLh4");
    const sheet = ss.getSheetByName("products");
    
    // Get all data from the sheet
    const rows = sheet.getDataRange().getValues();
    
    // Extract query parameters from the URL
    const categoryFilter = e.parameter.category;
    const bestSellerFilter = e.parameter.bestSeller;

    const results = [];
    
    // Loop through rows starting from index 1 (skipping header row)
    for (let i = 1; i < rows.length; i++) {
      const id = rows[i][0];
      const name = rows[i][1];
      
      // CRITICAL: Skip empty or corrupted rows during fetch
      if (!id || !name) continue; 

      const price = rows[i][2];
      const category = rows[i][3];
      const stock = rows[i][4];
      const description = rows[i][5];
      const isBestSeller = rows[i][6];
      const image = rows[i][7];

      let isMatch = true;

      // Apply category filter if provided
      if (categoryFilter && category !== categoryFilter) isMatch = false;
      
      // Apply Best Seller filter if requested as "true"
      if (bestSellerFilter === "true" && (isBestSeller !== true && isBestSeller !== "TRUE")) {
        isMatch = false;
      }

      // If product matches all filters, add to results array
      if (isMatch) {
        results.push({
          id: id,
          name: name,
          price: price,
          category: category,
          stock: stock,
          description: description,
          bestSeller: isBestSeller,
          image: image
        });
      }
    }

    // Return the filtered results as a JSON string
    return ContentService.createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    console.error("Error in doGet: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## `products.js` file in api folder:
> `getData` function to handle the api

```
/*
 * Function for fetching data from Google Apps Script
 * Supports optional category and bestSeller filtering
 */
export async function getData(category = "", bestSeller = false) {
  // Google Apps Script URL
  const GOOGLE_API_URL =
    "https://script.google.com/macros/s/AKfycbwyMMVSWDE42EA_d4OoDe9kbraLHadD-MrP6K8BEREpvp5VI5iqRL1HKtIpeRG9p5mmUQ/exec";

  // Create a new URLSearchParams object
  const params = new URLSearchParams();

  // If a category is specified, add it to the parameters
  if (category && category !== "الكل") {
    params.append("category", category);
  }

  // If bestSeller is true, add it to the parameters
  if (bestSeller) {
    params.append("bestSeller", "true");
  }

  // Convert the parameters to a query string
  const queryString = params.toString();
  const url = queryString ? `${GOOGLE_API_URL}?${queryString}` : GOOGLE_API_URL;

  const res = await fetch(url);

  if (!res.ok) throw new Error("Failed to fetch data from Google Sheets");

  return res.json();
}

```

---

## ⚓ Hooks:

### `useAllProducts` Hook:
> To fetch all the products

```
import { useEffect, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getData } from "../api/products";

const ALL_CATEGORIES = [
  "دفاتر",
  "أقلام",
  "شنط",
  "مجات",
  "منظمات مكتب",
  "باكيدچات أو بوكسات",
  "أخرى",
];

/**
 * Hook to fetch all products and prefetch category-specific data
 */
export default function useAllProducts(enabled = true) {
  const queryClient = useQueryClient();

  // Fetch main "all" data
  const {
    data: mainAllData,
    isError,
    error,
  } = useQuery({
    queryKey: ["products", ""],
    queryFn: () => getData(""),
    enabled: enabled,

    // Keep consistent with useProducts logic
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Prefetch all categories data in the background
  useEffect(() => {
    if (!enabled) return;

    ALL_CATEGORIES.forEach((cat) => {
      // IMPORTANT: Unified queryKey to match useProducts hook structure
      // This ensures that when a user switches to a category, the data is already in cache
      const categoryKey = ["products", { category: cat, bestSeller: false }];

      if (!queryClient.getQueryData(categoryKey)) {
        queryClient.prefetchQuery({
          queryKey: categoryKey,
          queryFn: () => getData(cat, false),
          staleTime: 1000 * 60 * 1,
        });
      }
    });
  }, [enabled, queryClient]);

  // Aggregate products from the most reliable source available
  const products = useMemo(() => {
    if (!enabled) return [];

    // Priority 1: Current fetch result for "All"
    if (mainAllData) return mainAllData;

    // Priority 2: Existing cache for the "all" key
    const allCached = queryClient.getQueryData(["products", ""]);
    if (allCached) return allCached;

    // Priority 3: Combine data from individual category caches using the unified Object Key
    return ALL_CATEGORIES.flatMap((cat) => {
      const cachedData = queryClient.getQueryData([
        "products",
        { category: cat, bestSeller: false },
      ]);
      return cachedData || [];
    });
  }, [enabled, queryClient, mainAllData]);

  const isLoading = enabled && products.length === 0;

  return { products, isLoading, isError, error };
}


```
---

### `useProducts` Hook:
> To fetch products by category
- To fetch the best-selling products `const { data: bestSellers, error } = useProducts("", true, true);`

```
import { useQuery } from "@tanstack/react-query";
import { getData } from "../api/products.js";

/**
 * Hook for fetching products based on a specific category
 */
export default function useProducts(
  category = "",
  enabled = true,
  bestSeller = false
) {
  return useQuery({
    queryKey: ["products", { category, bestSeller }],
    queryFn: () => getData(category, bestSeller),
    enabled,

    // Logic optimizations:
    staleTime: 1000 * 60 * 1, // Data is considered fresh for 1 minutes
    gcTime: 1000 * 60 * 30, // Keep unused data in memory for 30 minutes

    // Automatic sync triggers:
    refetchOnWindowFocus: true, // Sync data when user returns to the tab
    refetchOnMount: true, // Sync data when the component re-mounts

    retry: 2, // Retry failed requests twice
  });
}

```
---

### `useAddProduct` Hook:
> To add a product to the sheet

```
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to handle adding a new product and refreshing the cache
 */
export default function useAddProduct(uploadFunction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFunction, // This is your uploadProductLogic
    onSuccess: () => {
      // Invalidate the "products" key to force a background refresh
      // This tells React Query that any query starting with ["products"] is now old
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

```
---

## 🔐 `.env` File Content:

```
# For secure data

VITE_GOOGLE_API_URL=https://script.google.com/macros/s/AKfycbwyMMVSWDE42EA_d4OoDe9kbraLHadD-MrP6K8BEREpvp5VI5iqRL1HKtIpeRG9p5mmUQ/exec
VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/dcrvwnrds/image/upload
VITE_CLOUDINARY_PRESET=my_store_preset
VITE_ADMIN_PASSWORD=admin@2026
VITE_EMAILJS_SERVICE_ID=service_5madjur
VITE_EMAILJS_TEMPLATE_ID=template_ore4wca
VITE_EMAILJS_PUBLIC_KEY=YkpACEqDGtHiyonfJ
```
