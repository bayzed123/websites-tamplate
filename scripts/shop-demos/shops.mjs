/**
 * The shops built on the Zamil Shop BD platform that the hub demos (see build.mjs).
 *
 *   repo      — folder name of the shop's checkout, next to this repository
 *   shopDir   — hub folder for the storefront demo
 *   adminDir  — hub folder for the admin demo
 *   prefix    — the shop's own storage prefix (cart, language…), read from its code
 *   districts — where the demo's sample customers live, weighted toward the shop's own area
 *   reviews   — two reviews left waiting for approval in the admin
 *   coupon    — a starter coupon some sample orders use
 */
export const SHOPS = {
  "zamil-shop-bd": {
    repo: "babyshop",
    github: "bayzed123/babyshop",
    name: "Zamil Shop BD",
    shopDir: "zamil-shop-bd",
    adminDir: "zamil-shop-bd-admin",
    prefix: "zsb",
    districts: ["Dhaka", "Dhaka", "Dhaka", "Dhaka", "Gazipur", "Narayanganj", "Chattogram", "Sylhet", "Rajshahi", "Comilla"],
    people: [
      ["Nusrat Jahan", "01711223344"], ["Farzana Akter", "01819456721"], ["Sadia Islam", "01912345678"], ["Tanjila Rahman", "01556789012"],
      ["Mim Chowdhury", "01678901234"], ["Rakib Hasan", "01722334455"], ["Rumana Haque", "01833445566"], ["Jannatul Ferdous", "01944556677"],
      ["Ayesha Siddika", "01355667788"], ["Tanvir Ahmed", "01766778899"], ["Lamia Hossain", "01877889900"], ["Moushumi Das", "01988990011"],
      ["Sumaiya Karim", "01799001122"], ["Arif Hossain", "01611223355"], ["Afsana Mimi", "01512233466"], ["Nabila Tabassum", "01313344577"],
    ],
    coupon: "WELCOME100",
    reviews: [
      ["Sharmin", 5, "Soft fabric and the size chart was spot on for my 2-year-old. Delivered in Dhaka the next day."],
      ["Rumana", 4, "বাচ্চার খুব পছন্দ হয়েছে, প্যাকেজিংও ভালো ছিল। ডেলিভারি একদিন দেরি হয়েছে।"],
    ],
  },
  "sidra-jewellery": {
    repo: "jewellery-and-fashion-",
    github: "bayzed123/jewellery-and-fashion-",
    name: "Sidra Jewellery & Fashion",
    shopDir: "sidra-jewellery",
    adminDir: "sidra-jewellery-admin",
    prefix: "sjf",
    districts: ["Dhaka", "Dhaka", "Dhaka", "Gazipur", "Narayanganj", "Chattogram", "Chattogram", "Sylhet", "Khulna", "Tangail"],
    people: [
      ["Nusrat Jahan", "01711223344"], ["Farzana Akter", "01819456721"], ["Sadia Islam", "01912345678"], ["Tanjila Rahman", "01556789012"],
      ["Mim Chowdhury", "01678901234"], ["Sharmin Sultana", "01722334455"], ["Rumana Haque", "01833445566"], ["Jannatul Ferdous", "01944556677"],
      ["Ayesha Siddika", "01355667788"], ["Tasnim Ahmed", "01766778899"], ["Lamia Hossain", "01877889900"], ["Moushumi Das", "01988990011"],
      ["Sumaiya Karim", "01799001122"], ["Rehana Parvin", "01611223355"], ["Afsana Mimi", "01512233466"], ["Nabila Tabassum", "01313344577"],
    ],
    coupon: "WELCOME150",
    reviews: [
      ["Sharmin", 5, "The finish is beautiful and it came in a lovely box — perfect for my sister's holud."],
      ["Rumana", 4, "ডিজাইন ছবির মতোই সুন্দর। চেইনটা আরেকটু লম্বা হলে ভালো হতো।"],
    ],
  },
  "sidra-glow-studio": {
    repo: "skin-care-shop",
    github: "bayzed123/Skin-care-shop",
    name: "Sidra Glow Studio",
    shopDir: "sidra-glow-studio",
    adminDir: "sidra-glow-studio-admin",
    prefix: "sgs",
    districts: ["Tangail", "Tangail", "Tangail", "Tangail", "Dhaka", "Dhaka", "Gazipur", "Mymensingh", "Sirajganj", "Chattogram"],
    people: [
      ["Nusrat Jahan", "01711223344"], ["Farzana Akter", "01819456721"], ["Sadia Islam", "01912345678"], ["Tanjila Rahman", "01556789012"],
      ["Mim Chowdhury", "01678901234"], ["Sharmin Sultana", "01722334455"], ["Rumana Haque", "01833445566"], ["Jannatul Ferdous", "01944556677"],
      ["Ayesha Siddika", "01355667788"], ["Tasnim Ahmed", "01766778899"], ["Lamia Hossain", "01877889900"], ["Moushumi Das", "01988990011"],
      ["Sumaiya Karim", "01799001122"], ["Rehana Parvin", "01611223355"], ["Afsana Mimi", "01512233466"], ["Nabila Tabassum", "01313344577"],
    ],
    coupon: "GLOW100",
    reviews: [
      ["Sharmin", 5, "Light, absorbs fast and doesn't feel sticky in the humidity. Patch test was fine for my sensitive skin."],
      ["Rumana", 4, "টেক্সচার খুব ভালো, গন্ধও হালকা। দামটা আরেকটু কম হলে ভালো হতো।"],
    ],
    // The studio side: a few treatment bookings so the admin diary has something in it.
    bookings: 6,
  },
  "prakriti-herbal": {
    repo: "harbal-pakriti",
    github: "bayzed123/harbal-pakriti",
    name: "Prakriti Herbal",
    shopDir: "prakriti-herbal",
    adminDir: "prakriti-herbal-admin",
    prefix: "pkh",
    districts: ["Dhaka", "Dhaka", "Dhaka", "Dhaka", "Gazipur", "Narayanganj", "Chattogram", "Sylhet", "Rajshahi", "Khulna"],
    people: [
      ["Nusrat Jahan", "01711223344"], ["Farzana Akter", "01819456721"], ["Sadia Islam", "01912345678"], ["Tanvir Rahman", "01556789012"],
      ["Mim Chowdhury", "01678901234"], ["Rakib Hasan", "01722334455"], ["Rumana Haque", "01833445566"], ["Jannatul Ferdous", "01944556677"],
      ["Ayesha Siddika", "01355667788"], ["Tasnim Ahmed", "01766778899"], ["Kamrul Islam", "01877889900"], ["Moushumi Das", "01988990011"],
      ["Sumaiya Karim", "01799001122"], ["Arif Hossain", "01611223355"], ["Afsana Mimi", "01512233466"], ["Nabila Tabassum", "01313344577"],
    ],
    coupon: "PRAKRITI100",
    reviews: [
      ["Sharmin", 5, "Fresh, well sealed and the batch date was clearly printed. The tea has a lovely tulsi aroma."],
      ["Rumana", 4, "প্যাকেজিং খুব সুন্দর, তারিখ পরিষ্কার লেখা। ডেলিভারি একদিন দেরি হয়েছে।"],
    ],
  },
  "gadget-market": {
    repo: "gadget-market",
    github: "bayzed123/gadget-market",
    name: "Gadget Market",
    shopDir: "gadget-market",
    adminDir: "gadget-market-admin",
    prefix: "gmk",
    districts: ["Dhaka", "Dhaka", "Dhaka", "Dhaka", "Gazipur", "Narayanganj", "Chattogram", "Chattogram", "Sylhet", "Rajshahi"],
    people: [
      ["Rakib Hasan", "01711223344"], ["Tanvir Ahmed", "01819456721"], ["Sadia Islam", "01912345678"], ["Arif Hossain", "01556789012"],
      ["Mim Chowdhury", "01678901234"], ["Fahim Rahman", "01722334455"], ["Rumana Haque", "01833445566"], ["Shakil Ahmed", "01944556677"],
      ["Ayesha Siddika", "01355667788"], ["Nayeem Islam", "01766778899"], ["Lamia Hossain", "01877889900"], ["Imran Kabir", "01988990011"],
      ["Sumaiya Karim", "01799001122"], ["Mahmud Hasan", "01611223355"], ["Afsana Mimi", "01512233466"], ["Zahid Hasan", "01313344577"],
    ],
    coupon: "GADGET100",
    reviews: [
      ["Shakil", 5, "Battery easily lasts the advertised playtime and the case feels solid. Delivered in Dhaka the next day."],
      ["Rumana", 4, "চার্জার ঠিকমতো ফাস্ট চার্জ করে, প্যাকেজিংও ভালো। ডেলিভারি একদিন দেরি হয়েছে।"],
    ],
  },
};
