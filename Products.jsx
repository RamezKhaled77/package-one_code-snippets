import { useState, useEffect, useMemo } from "react"; // أضفنا useMemo
import { useSearchParams } from "react-router";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import LogoWord from "../atoms/LogoWord.jsx";
import CategoriesList from "../molecules/CategoriesList.jsx";
import ProductCard from "../molecules/ProductCard.jsx";
import PaginationBar from "../molecules/PaginationBar.jsx";
import Error from "../atoms/Error.jsx";
import Product from "../organisms/Product.jsx";
import { AnimatePresence, motion } from "framer-motion";

import useProducts from "../../hooks/useProducts.js";
import useAllProducts from "../../hooks/useAllProducts.js";

const ALL_CATEGORIES = [
  "دفاتر",
  "أقلام",
  "شنط",
  "مجات",
  "منظمات مكتب",
  "باكيدچات أو بوكسات",
  "أخرى",
];

const map = {
  notes: "دفاتر",
  pens: "أقلام",
  bags: "شنط",
  mugs: "مجات",
  boxs: "باكيدچات أو بوكسات",
  "office-organizers": "منظمات مكتب",
  others: "أخرى",
};

function Products() {
  const [showProductModal, setShowProductModal] = useState(false);
  const [dataToShow, setDataToShow] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();

  // Default active category from URL or "الكل"
  const [activeCategory, setActiveCategory] = useState(() => {
    const categoryFromURL = new URLSearchParams(window.location.search).get(
      "category"
    );
    return map[categoryFromURL] || "الكل";
  });

  const handleCategoryChange = (categoryName) => {
    // To update both state and URL param
    const reverseMap = {
      دفاتر: "notes",
      أقلام: "pens",
      شنط: "bags",
      مجات: "mugs",
      "باكيدچات أو بوكسات": "boxs",
      "منظمات مكتب": "office-organizers",
      أخرى: "others",
      الكل: "", // If "الكل", no param
    };

    const urlParam = reverseMap[categoryName];

    // 2. Update state and URL param
    if (urlParam) {
      setSearchParams({ category: urlParam });
    } else {
      setSearchParams({}); // Remove param for "الكل"
    }
  };

  /* ===============================
      URL → Active Category Sync
  =============================== */
  useEffect(() => {
    const categoryFromURL = searchParams.get("category");
    const targetCategory = map[categoryFromURL] || "الكل";

    // Update only if different to avoid loop
    if (activeCategory !== targetCategory) {
      setActiveCategory(targetCategory);
    }
  }, [searchParams, activeCategory]);

  const isAllActive = activeCategory === "الكل";

  /* ===============================
      Data Fetching (Smart Caching)
  =============================== */

  // Work only when "الكل" is active
  const {
    products: allProducts,
    isLoading: allLoading,
    isError: allIsError,
    error: allError,
  } = useAllProducts(isAllActive);

  // Work for specific category when not "الكل"
  const {
    data: currentCategoryProducts = [],
    isLoading: catLoading,
    isError: catIsError,
    error: catError,
  } = useProducts(activeCategory, !isAllActive, false);

  // To determine which products to show
  const filteredProducts = useMemo(() => {
    return isAllActive ? allProducts : currentCategoryProducts;
  }, [isAllActive, allProducts, currentCategoryProducts]);

  // Final loading state
  const finalLoading = isAllActive
    ? allLoading && allProducts.length === 0
    : catLoading && currentCategoryProducts.length === 0;

  /* ===============================
      Pagination Logic
  =============================== */
  const itemsPerPage = 12;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currProducts = filteredProducts.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  if (allIsError || catIsError)
    return <Error message={allError?.message || catError?.message} />;

  // console.log(isAllActive, activeCategory, allProducts, filteredProducts);

  return (
    <>
      <AnimatePresence>
        {showProductModal && (
          <Product showModal={setShowProductModal} data={dataToShow} />
        )}
      </AnimatePresence>

      <div className="p-6 px-8 mt-14">
        <div className="flex max-sm:flex-col justify-between items-start sm:items-center my-4 ">
          <LogoWord className="text-4xl text-accent-dark-2 pr-2">
            منتجاتنا
          </LogoWord>

          {!finalLoading && (
            <CategoriesList
              categories={["الكل", ...ALL_CATEGORIES]}
              activeCategory={activeCategory}
              setActiveCategory={handleCategoryChange}
            />
          )}
        </div>

        <div className="products-list grid justify-items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence mode="wait">
            {finalLoading ? (
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <div key={index} className="w-full p-2 rounded-2xl">
                  <Skeleton height={200} className="rounded-xl" />
                  <Skeleton
                    count={2}
                    height={20}
                    style={{ marginTop: "0.5rem" }}
                  />
                </div>
              ))
            ) : (
              <motion.div
                key={activeCategory} // مفتاح التغيير هو القسم
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full col-span-full"
              >
                {currProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    data={product}
                    showModal={setShowProductModal}
                    setData={setDataToShow}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!finalLoading && filteredProducts.length > 0 && (
          <PaginationBar
            products={filteredProducts}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>
    </>
  );
}

export default Products;

