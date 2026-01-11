import { useState, useRef, useEffect } from "react";
import emailjs from "@emailjs/browser";
import useAddProduct from "../../hooks/useAddProduct";
import { Toaster, toast } from "sonner";
import {
  BookOpen,
  PenTool,
  LayoutGrid,
  Coffee,
  Briefcase,
  Package,
  ShieldQuestionMark,
  ChevronDown,
} from "lucide-react";

const categories = [
  {
    label: "دفاتر",
    value: "دفاتر",
    colors: {
      txt: "text-purple-600",
      bg: "bg-purple-100",
      bgHover: "hover:bg-purple-200",
    },
    icon: BookOpen,
  },
  {
    label: "أقلام",
    value: "أقلام",
    colors: {
      txt: "text-blue-600",
      bg: "bg-blue-100",
      bgHover: "hover:bg-blue-200",
    },
    icon: PenTool,
  },
  {
    label: "منظمات مكتب",
    value: "منظمات مكتب",
    colors: {
      txt: "text-yellow-600",
      bg: "bg-yellow-100",
      bgHover: "hover:bg-yellow-200",
    },
    icon: LayoutGrid,
  },
  {
    label: "مجات",
    value: "مجات",
    colors: {
      txt: "text-green-600",
      bg: "bg-green-100",
      bgHover: "hover:bg-green-200",
    },
    icon: Coffee,
  },
  {
    label: "شنط",
    value: "شنط",
    colors: {
      txt: "text-orange-600",
      bg: "bg-orange-100",
      bgHover: "hover:bg-orange-200",
    },
    icon: Briefcase,
  },
  {
    label: "بوكسات",
    value: "بوكسات",
    colors: {
      txt: "text-red-600",
      bg: "bg-red-100",
      bgHover: "hover:bg-red-200",
    },
    icon: Package,
  },
  {
    label: "أخرى",
    value: "أخرى",
    colors: {
      txt: "text-gray-600",
      bg: "bg-gray-100",
      bgHover: "hover:bg-gray-200",
    },
    icon: ShieldQuestionMark,
  },
];

const GOOGLE_API_URL = import.meta.env.VITE_GOOGLE_API_URL;
const CLOUDINARY_URL = import.meta.env.VITE_CLOUDINARY_URL;
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export default function AddProduct() {
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // Remaining time in seconds
  const [category, setCategory] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bestSeller, setBestSeller] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const formRef = useRef(null);

  // Initialize and check for existing lockout on mount (Persistence)
  useEffect(() => {
    const lockoutExpiry = localStorage.getItem("adminLockoutExpiry");
    if (lockoutExpiry) {
      const remainingTime = Math.floor(
        (parseInt(lockoutExpiry) - Date.now()) / 1000
      );
      if (remainingTime > 0) {
        setIsLocked(true);
        setTimeLeft(remainingTime);
      } else {
        localStorage.removeItem("adminLockoutExpiry");
      }
    }
  }, []);

  // Countdown timer logic for lockout period
  useEffect(() => {
    let timer;
    if (isLocked && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
      localStorage.removeItem("adminLockoutExpiry");
    }

    return () => clearInterval(timer);
  }, [isLocked, timeLeft]);

  /**
   * Core logic to handle Cloudinary upload and Google Sheets data transmission
   * @param {Object} formDataValues - The product details from the form
   */
  const uploadProductLogic = async (formDataValues) => {
    if (!selectedFile) throw new Error("Please select a product image");
    if (!formDataValues.category)
      throw new Error("Please select a product category");

    // 1. Upload assets to Cloudinary
    const imageData = new FormData();
    imageData.append("file", selectedFile);
    imageData.append("upload_preset", CLOUDINARY_PRESET);

    const cloudRes = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: imageData,
    });

    const cloudJson = await cloudRes.json();
    if (!cloudJson.secure_url) throw new Error("Cloudinary upload failed");

    // 2. Transmit data to Google Sheets via Web App
    // We send it as plain text to avoid CORS preflight issues with Apps Script,
    // then parse it as JSON on the server side.
    const productData = {
      ...formDataValues,
      image: cloudJson.secure_url,
      timestamp: new Date().toLocaleString("ar-EG"),
    };

    const response = await fetch(GOOGLE_API_URL, {
      method: "POST",
      // Essential: Use text/plain to bypass complex CORS preflight while sending JSON string
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok && response.status !== 0) {
      throw new Error("Failed to send data to Google Sheets");
    }

    return "Done";
  };

  //  Use mutateAsync instead of calling uploadProductLogic directly
  const addProductMutation = useAddProduct(uploadProductLogic);

  // Format seconds to MM:SS string
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isLocked) {
      toast.error(
        `Access denied. Please try again after ${formatTime(timeLeft)}`
      );
      return;
    }

    if (passInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAttempts(0);
      toast.success("Welcome, Admin!");
    } else {
      setPassInput("");
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        // Define lockout period (30 minutes) and persist expiry time
        const lockoutDuration = 30 * 60 * 1000;
        const expiryTimestamp = Date.now() + lockoutDuration;
        localStorage.setItem("adminLockoutExpiry", expiryTimestamp);

        setIsLocked(true);
        setTimeLeft(lockoutDuration / 1000);

        // Security Alert via EmailJS
        const templateParams = {
          time: new Date().toLocaleString("ar-EG"),
          user_agent: navigator.userAgent,
        };

        emailjs
          .send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
            templateParams,
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
          )
          .then(() => console.log("Security alert dispatched successfully."))
          .catch((error) =>
            console.error("EmailJS Security alert failed:", error)
          );

        toast.error(
          "Account locked due to multiple failed attempts. Security alert sent."
        );
      } else {
        toast.error(`Invalid password. ${3 - newAttempts} attempts remaining.`);
      }
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setPassInput("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const form = e.target;
    const formDataValues = {
      name: form.name.value,
      price: form.price.value,
      stock: form.stock.value,
      category: category,
      description: form.description.value,
      bestSeller: bestSeller,
    };

    // 3. Use mutateAsync instead of calling uploadProductLogic directly
    toast.promise(addProductMutation.mutateAsync(formDataValues), {
      loading: "Processing product data...",
      success: () => {
        setImagePreview(null);
        setSelectedFile(null);
        setBestSeller(false);
        setCategory("");
        form.reset();
        return "Product added successfully! 🎉";
      },
      error: (err) => `${err.message}`,
    });
  };

  if (!isAdmin) {
    return (
      <div
        dir="ltr"
        className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-almarai"
      >
        <Toaster position="top-center" richColors />
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Please enter the admin password to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passInput}
              disabled={isLocked}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder={isLocked ? "Try again later" : "Enter password"}
              className={`w-full px-4 py-3 rounded-xl border ${
                isLocked ? "bg-gray-100" : "border-gray-200"
              } focus:ring-2 focus:ring-green-500 outline-none text-center`}
              required
            />

            <button
              disabled={isLocked}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                isLocked
                  ? "bg-gray-400  text-gray-200 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              }`}
            >
              {isLocked
                ? `Try again later in ${formatTime(timeLeft)}`
                : "Login"}
            </button>

            {isLocked && (
              <p className="text-red-500 text-sm text-center font-medium animate-pulse">
                ⚠️ You have been locked out due to multiple failed attempts.
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6  text-right relative font-almarai"
    >
      <button
        onClick={handleLogout}
        className="absolute top-4 left-4 cursor-pointer text-sm bg-red-50 text-red-500 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors border border-red-100 font-bold"
      >
        تسجيل خروج
      </button>

      <div className="w-full max-w-2xl bg-white rounded-3xl mt-10 shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-linear-to-r from-green-600 to-emerald-500 p-6 text-white text-center">
          <h1 className="text-2xl font-bold">إضافة منتج جديد</h1>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <Label>اسم المنتج</Label>
            <input
              name="name"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="مثال: دفتر ملاحظات"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>السعر (EGP)</Label>
              <input
                name="price"
                type="number"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label>الكمية</Label>
              <input
                name="stock"
                type="number"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="10"
              />
            </div>
          </div>

          <div className="space-y-1 text-right">
            <Label>تصنيف المنتج</Label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>

          <div className="space-y-1">
            <Label>وصف المنتج</Label>
            <textarea
              name="description"
              rows="2"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none resize-none"
              placeholder="اكتب تفاصيل المنتج..."
            />
          </div>

          <Label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={bestSeller}
              onChange={(e) => setBestSeller(e.target.checked)}
              className="w-5 h-5 accent-green-600 rounded"
            />
            <span className="text-sm font-bold text-gray-700">
              تمييز المنتج كـ "أكثر مبيعاً"
            </span>
          </Label>

          <div className="space-y-1">
            <Label>صورة المنتج</Label>
            <div
              className={`mt-2 border-2 border-dashed rounded-2xl p-4 transition-colors ${
                imagePreview
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 bg-gray-50"
              }`}
            >
              {imagePreview ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden flex justify-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <Label className="cursor-pointer flex flex-col items-center justify-center py-4">
                  <div className="bg-white p-3 rounded-full shadow-sm mb-2 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-500 font-medium">
                    اضغط لاختيار صورة
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </Label>
              )}
            </div>
          </div>

          <button
            disabled={loading}
            className={`w-full py-4 rounded-2xl cursor-pointer font-bold text-lg transition-all transform active:scale-[0.98] shadow-lg ${
              loading
                ? "bg-gray-400 cursor-not-allowed text-gray-100"
                : "bg-green-600 hover:bg-green-700 text-white shadow-green-100"
            }`}
          >
            {loading ? "جاري المعالجة..." : "إضافة المنتج الآن"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CategorySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = categories.find((c) => c.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-4 p-2 rounded-xl border border-gray-200 bg-gray-50"
    >
      <span className="text-base font-semibold text-gray-700 whitespace-nowrap mr-2">
        القسم:
      </span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex-1 flex items-center cursor-pointer justify-between gap-3 py-2 px-4 rounded-xl ${
          selected?.colors?.bg ? selected?.colors?.bg : "bg-gray-100"
        } ${
          selected?.colors?.bgHover
            ? selected?.colors?.bgHover
            : "hover:bg-gray-200"
        } transition-colors`}
      >
        {selected ? (
          <div className={`flex items-center gap-2 ${selected?.colors?.txt}`}>
            <selected.icon size={18} />
            <span className="font-bold">{selected.label}</span>
          </div>
        ) : (
          <span className="text-gray-400">اختر من القائمة</span>
        )}
        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute flex flex-col gap-1 top-[110%] right-0 left-0 z-[100] bg-gray-300 border p-1 border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {categories.map((cat) => (
            <div
              key={cat.value}
              onClick={() => {
                onChange(cat.value);
                setOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-fuchsia-50 cursor-pointer rounded-xl transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                <cat.icon size={18} />
              </div>
              <span className="font-medium text-gray-700">{cat.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ children, className }) {
  return (
    <label
      className={
        className ? className : "text-lg font-semibold text-gray-700 block"
      }
    >
      {children}
    </label>
  );
}
