
# package-one_code-snippets

## 📰 Google sheet - (App Script code):
```
/**
 * Handle POST requests from the React application
 * @param {Object} e - The event object containing postData
 */
function doPost(e) {
  try {
    // Connect to the specific Spreadsheet and Sheet
    const ss = SpreadsheetApp.openById("1BCjqtFYoPdVS6ruWJBx9lILGrfItbEmzS8B8kAXGLh4");
    const sheet = ss.getSheetByName("products");

    // Parse the JSON string sent from the frontend
    const data = JSON.parse(e.postData.contents);

    // Generate a unique Product ID using timestamp
    const productId = "ID-" + new Date().getTime();

    // Logic to find the actual last row with data in Column B (Name)
    // This prevents overwriting or skipping rows due to formatting
    const nameColumnValues = sheet.getRange("B:B").getValues();
    let lastRowWithData = 0;
    for (let i = nameColumnValues.length - 1; i >= 0; i--) {
      if (nameColumnValues[i][0] !== "") {
        lastRowWithData = i + 1;
        break;
      }
    }

    // Determine target row (starting from row 2 if sheet is empty)
    const nextRow = Math.max(lastRowWithData + 1, 2);

    // Map data to the correct columns (A to I)
    const rowValues = [[
      productId,         // Column A: ID
      data.name,         // Column B: Name
      data.price,        // Column C: Price
      data.category,     // Column D: Category
      data.stock,        // Column E: Stock
      data.description,  // Column F: Description
      data.bestSeller,   // Column G: Best Seller (True/False)
      data.image,        // Column H: Image URL
      new Date()         // Column I: System Timestamp
    ]];

    // Save data to sheet
    sheet.getRange(nextRow, 1, 1, 9).setValues(rowValues);

    return ContentService.createTextOutput("Success")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Handle GET requests for fetching and filtering products
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById("1BCjqtFYoPdVS6ruWJBx9lILGrfItbEmzS8B8kAXGLh4");
    const sheet = ss.getSheetByName("products");
    const rows = sheet.getDataRange().getValues();

    const categoryFilter = e.parameter.category;
    const bestSellerFilter = e.parameter.bestSeller; // Receive TRUE to browser

    const results = [];

    // Start from 1 to skip the titles
    for (let i = 1; i < rows.length; i++) {
      const id = rows[i][0];
      if (!id) continue; // Skip the empty rows

      const name = rows[i][1];
      const price = rows[i][2];
      const category = rows[i][3];
      const isBestSeller = rows[i][6]; // 'G' row
      const image = rows[i][7];

      let isMatch = true;

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

    return ContentService.createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## `products.js file` in api folder:
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
