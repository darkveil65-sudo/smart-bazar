export type Lang = 'en' | 'banglish' | 'bn';

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.shop': 'Shop',
    'nav.cart': 'Cart',
    'nav.orders': 'Orders',
    'nav.profile': 'Profile',

    // Header
    'header.delivery': 'Delivery',
    'header.nearestStore': 'Nearest Store',

    // Offer ticker
    'offer.1': '🚀 Free delivery on orders above ₹199',
    'offer.2': '🛋️ Premium furniture & decor delivered to your doorstep',
    'offer.3': '🎁 Flat ₹50 OFF on your first order',
    'offer.4': '⚡ Express delivery available',
    'offer.5': '🌿 100% quality assurance guaranteed',

    // Auth — General
    'auth.appTagline': 'Premium furniture & home decor store 🏡',
    'auth.badge.fresh': '🛋️ Luxury',
    'auth.badge.fast': '⚡ Fast',
    'auth.badge.trusted': '⭐ Premium',
    'auth.newHere': 'New here? Create Account',
    'auth.tab.signin': '👋 Sign In',
    'auth.tab.signup': '✨ Create Account',

    // Auth — Login
    'auth.login.title': 'Welcome back 👋',
    'auth.login.subtitle': 'Sign in to continue shopping',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.forgot': 'Forgot password?',
    'auth.login.submit': 'Sign In',
    'auth.login.submitting': 'Signing in...',
    'auth.login.noAccount': 'New here?',
    'auth.login.createLink': 'Create account →',

    // Auth — Signup
    'auth.signup.title': 'Create account ✨',
    'auth.signup.subtitle': 'Join Smart Bazar today',
    'auth.signup.name': 'Full Name',
    'auth.signup.namePlaceholder': 'Your full name',
    'auth.signup.email': 'Email',
    'auth.signup.password': 'Password',
    'auth.signup.passwordPlaceholder': 'Min 6 characters',
    'auth.signup.phone': 'Phone Number',
    'auth.signup.phonePlaceholder': 'e.g. 9876543210',
    'auth.signup.submit': 'Create Account',
    'auth.signup.submitting': 'Creating account...',
    'auth.signup.hasAccount': 'Already have an account?',
    'auth.signup.signInLink': 'Sign in →',

    // Auth — Forgot
    'auth.forgot.title': 'Reset password 🔑',
    'auth.forgot.subtitle': "We'll send a reset link to your email",
    'auth.forgot.email': 'Email',
    'auth.forgot.submit': 'Send Reset Link',
    'auth.forgot.submitting': 'Sending...',
    'auth.forgot.back': 'Back',

    // Home
    'home.search': 'Search products, categories...',
    'home.shopNow': 'Shop Now',
    'home.viewAll': 'View All',
    'home.featuredCategories': 'Featured Categories',
    'home.popularProducts': 'Popular Products',
    'home.specialOffers': 'Special Offers',
    'home.newArrivals': 'New Arrivals',
    'home.deliveryIn': 'Delivery in',
    'home.minutes': 'mins',

    // Cart
    'cart.title': 'Your Cart',
    'cart.empty': 'Your cart is empty',
    'cart.emptySubtitle': 'Add some premium furniture & decor to your space!',
    'cart.shopNow': 'Shop Now',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.item': 'item',
    'cart.items': 'items',
    'cart.removeAll': 'Clear Cart',
    'cart.savings': 'You save',
    'cart.delivery': 'Delivery',
    'cart.free': 'FREE',
    'cart.placeOrder': 'Place Order',
    'cart.orderSummary': 'Order Summary',
    'cart.subtotal': 'Subtotal',
    'cart.deliveryFee': 'Delivery fee',
    'cart.totalAmount': 'Total Amount',
    'cart.checkoutWithTotal': 'Proceed to Checkout — ₹',

    // Orders
    'orders.title': 'My Orders',
    'orders.empty': 'No orders yet',
    'orders.emptySubtitle': 'Your order history will appear here',
    'orders.shopNow': 'Start Shopping',
    'orders.status.pending': 'Pending',
    'orders.status.confirmed': 'Confirmed',
    'orders.status.delivered': 'Delivered',
    'orders.status.cancelled': 'Cancelled',
    'orders.viewDetails': 'View Details',

    // Profile
    'profile.title': 'My Profile',
    'profile.editProfile': 'Edit Profile',
    'profile.logout': 'Logout',
    'profile.orders': 'My Orders',
    'profile.address': 'Addresses',
    'profile.support': 'Help & Support',
    'profile.language': 'Language',

    // Category / Product
    'product.addToCart': 'Add',
    'product.outOfStock': 'Out of Stock',
    'product.off': 'OFF',
    'product.inCart': 'In Cart',
    'category.allProducts': 'All Products',
    'category.noProducts': 'No products found',

    // Toast / Error messages
    'toast.loginSuccess': 'Welcome back! 👋',
    'toast.signupSuccess': 'Welcome to Smart Bazar! 🎉',
    'toast.fillAllFields': 'Please fill all fields',
    'toast.passwordShort': 'Password must be at least 6 characters',
    'toast.emailExists': 'Email already registered',
    'toast.invalidCredentials': 'Invalid email or password',
    'toast.tooManyAttempts': 'Too many attempts. Try again later.',
    'toast.loginFailed': 'Login failed. Check your connection.',
    'toast.resetSent': 'Reset link sent! Check your inbox.',
    'toast.enterEmail': 'Please enter your email',
    'toast.noAccount': 'No account found with this email',
    'toast.resetFailed': 'Failed to send reset email',
    'toast.loading': 'Loading Smart Bazar…',

    // Maintenance
    'maintenance.title': 'Under Maintenance',
    'maintenance.back': "We'll be back shortly. Thank you for your patience! 🙏",
  },

  banglish: {
    // Nav
    'nav.home': 'Home',
    'nav.shop': 'Shop',
    'nav.cart': 'Cart',
    'nav.orders': 'Orders',
    'nav.profile': 'Profile',

    // Header
    'header.delivery': 'Delivery',
    'header.nearestStore': 'Kachhaker Store',

    // Offer ticker
    'offer.1': '🚀 ₹199 er upor order e free delivery',
    'offer.2': '🛋️ Premium furniture o decor barite delivery',
    'offer.3': '🎁 Prothom order e flat ₹50 ছাড়',
    'offer.4': '⚡ Express delivery available ache',
    'offer.5': '🌿 100% quality product guaranteed',

    // Auth — General
    'auth.appTagline': 'Premium furniture & home decor store 🏡',
    'auth.badge.fresh': '🛋️ Luxury',
    'auth.badge.fast': '⚡ Dhruto',
    'auth.badge.trusted': '⭐ Premium',
    'auth.newHere': 'Notun? Account banao',
    'auth.tab.signin': '👋 Login',
    'auth.tab.signup': '✨ Account Banao',

    // Auth — Login
    'auth.login.title': 'Swagatam 👋',
    'auth.login.subtitle': 'Login kore shopping continue korun',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.forgot': 'Password bhule gechhen?',
    'auth.login.submit': 'Login Korun',
    'auth.login.submitting': 'Login hocche...',
    'auth.login.noAccount': 'Notun achen?',
    'auth.login.createLink': 'Account banao →',

    // Auth — Signup
    'auth.signup.title': 'Account Banao ✨',
    'auth.signup.subtitle': 'Aj-i Smart Bazar e jog din',
    'auth.signup.name': 'Purno Nam',
    'auth.signup.namePlaceholder': 'Apnar nam',
    'auth.signup.email': 'Email',
    'auth.signup.password': 'Password',
    'auth.signup.passwordPlaceholder': 'Kom-pakkhe 6 character',
    'auth.signup.phone': 'Phone Number',
    'auth.signup.phonePlaceholder': 'e.g. 9876543210',
    'auth.signup.submit': 'Account Banao',
    'auth.signup.submitting': 'Account toiri hocche...',
    'auth.signup.hasAccount': 'Account ache?',
    'auth.signup.signInLink': 'Login korun →',

    // Auth — Forgot
    'auth.forgot.title': 'Password Reset 🔑',
    'auth.forgot.subtitle': 'Apnar email e reset link pathano hobe',
    'auth.forgot.email': 'Email',
    'auth.forgot.submit': 'Reset Link Pathao',
    'auth.forgot.submitting': 'Pathano hocche...',
    'auth.forgot.back': 'Phire jao',

    // Home
    'home.search': 'Product, category khujun...',
    'home.shopNow': 'Ekhoni Kinun',
    'home.viewAll': 'Sob Dekhun',
    'home.featuredCategories': 'Featured Category',
    'home.popularProducts': 'Jokhyar Product',
    'home.specialOffers': 'Special Offer',
    'home.newArrivals': 'Notun Ashechhe',
    'home.deliveryIn': 'Delivery hobe',
    'home.minutes': 'minute e',

    // Cart
    'cart.title': 'Apnar Cart',
    'cart.empty': 'Cart khali ache',
    'cart.emptySubtitle': 'Ghorer jonno premium furniture add korun!',
    'cart.shopNow': 'Ekhoni Kinun',
    'cart.total': 'Mot',
    'cart.checkout': 'Checkout',
    'cart.item': 'ta jinish',
    'cart.items': 'ta jinish',
    'cart.removeAll': 'Cart Khali Korun',
    'cart.savings': 'Apnar sochoy',
    'cart.delivery': 'Delivery',
    'cart.free': 'FREE',
    'cart.placeOrder': 'Order Den',
    'cart.orderSummary': 'Order Summary',
    'cart.subtotal': 'Mot Dam',
    'cart.deliveryFee': 'Delivery Charge',
    'cart.totalAmount': 'Mot Taka',
    'cart.checkoutWithTotal': 'Checkout Korun — ₹',

    // Orders
    'orders.title': 'Amar Order',
    'orders.empty': 'Ekhono kono order nei',
    'orders.emptySubtitle': 'Apnar order history ekhane dekhabe',
    'orders.shopNow': 'Shopping Shuru Korun',
    'orders.status.pending': 'Pending',
    'orders.status.confirmed': 'Confirmed',
    'orders.status.delivered': 'Deliver hoyechhe',
    'orders.status.cancelled': 'Cancel hoyechhe',
    'orders.viewDetails': 'Details Dekhun',

    // Profile
    'profile.title': 'Amar Profile',
    'profile.editProfile': 'Profile Edit Korun',
    'profile.logout': 'Logout Korun',
    'profile.orders': 'Amar Orders',
    'profile.address': 'Address',
    'profile.support': 'Sahajjo',
    'profile.language': 'Bhasha',

    // Category / Product
    'product.addToCart': 'Add',
    'product.outOfStock': 'Stock Nei',
    'product.off': 'ছাড়',
    'product.inCart': 'Cart e Ache',
    'category.allProducts': 'Sob Product',
    'category.noProducts': 'Kono product paoa jainni',

    // Toast / Error messages
    'toast.loginSuccess': 'Swagatam! 👋',
    'toast.signupSuccess': 'Smart Bazar e Swagatam! 🎉',
    'toast.fillAllFields': 'Sob ghur purno korun',
    'toast.passwordShort': 'Password kom-pakkhe 6 character hote hobe',
    'toast.emailExists': 'Email already registered ache',
    'toast.invalidCredentials': 'Email ba password sothik na',
    'toast.tooManyAttempts': 'Onek baar try korechen. Pore try korun.',
    'toast.loginFailed': 'Login hoeni. Connection check korun.',
    'toast.resetSent': 'Reset link pathano hoyechhe! Inbox dekhun.',
    'toast.enterEmail': 'Email diye jaan',
    'toast.noAccount': 'Ei email e kono account nei',
    'toast.resetFailed': 'Reset email pathano jaeni',
    'toast.loading': 'Smart Bazar load hocche…',

    // Maintenance
    'maintenance.title': 'Maintenance Cholchhe',
    'maintenance.back': 'Amra shighroi fire ashbo. Dhonnyobad! 🙏',
  },

  bn: {
    // Nav
    'nav.home': 'হোম',
    'nav.shop': 'শপ',
    'nav.cart': 'কার্ট',
    'nav.orders': 'অর্ডার',
    'nav.profile': 'প্রোফাইল',

    // Header
    'header.delivery': 'ডেলিভারি',
    'header.nearestStore': 'কাছের স্টোর',

    // Offer ticker
    'offer.1': '🚀 ₹১৯৯ এর উপর অর্ডারে বিনামূল্যে ডেলিভারি',
    'offer.2': '🛋️ আপনার দোরগোড়ায় প্রিমিয়াম আসবাবপত্র ও সাজসজ্জা',
    'offer.3': '🎁 প্রথম অর্ডারে ফ্ল্যাট ₹৫০ ছাড়',
    'offer.4': '⚡ এক্সপ্রেস ডেলিভারি উপলব্ধ',
    'offer.5': '🌿 ১০০% গুণমানের নিশ্চয়তার গ্যারান্টি',

    // Auth — General
    'auth.appTagline': 'প্রিমিয়াম আসবাবপত্র এবং গৃহসজ্জা সামগ্রী 🏡',
    'auth.badge.fresh': '🛋️ বিলাসবহুল',
    'auth.badge.fast': '⚡ দ্রুত',
    'auth.badge.trusted': '⭐ প্রিমিয়াম',
    'auth.newHere': 'নতুন? অ্যাকাউন্ট তৈরি করুন',
    'auth.tab.signin': '👋 লগইন',
    'auth.tab.signup': '✨ অ্যাকাউন্ট তৈরি করুন',

    // Auth — Login
    'auth.login.title': 'স্বাগতম 👋',
    'auth.login.subtitle': 'লগইন করে শপিং চালিয়ে যান',
    'auth.login.email': 'ইমেইল',
    'auth.login.password': 'পাসওয়ার্ড',
    'auth.login.forgot': 'পাসওয়ার্ড ভুলে গেছেন?',
    'auth.login.submit': 'লগইন করুন',
    'auth.login.submitting': 'লগইন হচ্ছে...',
    'auth.login.noAccount': 'নতুন আছেন?',
    'auth.login.createLink': 'অ্যাকাউন্ট তৈরি করুন →',

    // Auth — Signup
    'auth.signup.title': 'অ্যাকাউন্ট তৈরি করুন ✨',
    'auth.signup.subtitle': 'আজই Smart Bazar এ যোগ দিন',
    'auth.signup.name': 'পুরো নাম',
    'auth.signup.namePlaceholder': 'আপনার নাম',
    'auth.signup.email': 'ইমেইল',
    'auth.signup.password': 'পাসওয়ার্ড',
    'auth.signup.passwordPlaceholder': 'কমপক্ষে ৬ অক্ষর',
    'auth.signup.phone': 'ফোন নম্বর',
    'auth.signup.phonePlaceholder': 'যেমন: ৯৮৭৬৫৪৩২১০',
    'auth.signup.submit': 'অ্যাকাউন্ট তৈরি করুন',
    'auth.signup.submitting': 'অ্যাকাউন্ট তৈরি হচ্ছে...',
    'auth.signup.hasAccount': 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
    'auth.signup.signInLink': 'লগইন করুন →',

    // Auth — Forgot
    'auth.forgot.title': 'পাসওয়ার্ড রিসেট 🔑',
    'auth.forgot.subtitle': 'আপনার ইমেইলে রিসেট লিংক পাঠানো হবে',
    'auth.forgot.email': 'ইমেইল',
    'auth.forgot.submit': 'রিসেট লিংক পাঠান',
    'auth.forgot.submitting': 'পাঠানো হচ্ছে...',
    'auth.forgot.back': 'ফিরে যান',

    // Home
    'home.search': 'পণ্য, ক্যাটাগরি খুঁজুন...',
    'home.shopNow': 'এখনই কিনুন',
    'home.viewAll': 'সব দেখুন',
    'home.featuredCategories': 'বিশেষ ক্যাটাগরি',
    'home.popularProducts': 'জনপ্রিয় পণ্য',
    'home.specialOffers': 'বিশেষ অফার',
    'home.newArrivals': 'নতুন এসেছে',
    'home.deliveryIn': 'ডেলিভারি হবে',
    'home.minutes': 'মিনিটে',

    // Cart
    'cart.title': 'আপনার কার্ট',
    'cart.empty': 'কার্ট খালি আছে',
    'cart.emptySubtitle': 'আপনার ঘরের জন্য প্রিমিয়াম আসবাবপত্র যোগ করুন!',
    'cart.shopNow': 'এখনই কিনুন',
    'cart.total': 'মোট',
    'cart.checkout': 'চেকআউট',
    'cart.item': 'টি পণ্য',
    'cart.items': 'টি পণ্য',
    'cart.removeAll': 'কার্ট খালি করুন',
    'cart.savings': 'আপনার সাশ্রয়',
    'cart.delivery': 'ডেলিভারি',
    'cart.free': 'বিনামূল্যে',
    'cart.placeOrder': 'অর্ডার দিন',
    'cart.orderSummary': 'অর্ডার সারাংশ',
    'cart.subtotal': 'উপমোট',
    'cart.deliveryFee': 'ডেলিভারি ফি',
    'cart.totalAmount': 'মোট পরিমাণ',
    'cart.checkoutWithTotal': 'চেকআউট করুন — ₹',

    // Orders
    'orders.title': 'আমার অর্ডার',
    'orders.empty': 'এখনো কোন অর্ডার নেই',
    'orders.emptySubtitle': 'আপনার অর্ডার ইতিহাস এখানে দেখাবে',
    'orders.shopNow': 'শপিং শুরু করুন',
    'orders.status.pending': 'অপেক্ষমান',
    'orders.status.confirmed': 'নিশ্চিত হয়েছে',
    'orders.status.delivered': 'ডেলিভারি হয়েছে',
    'orders.status.cancelled': 'বাতিল হয়েছে',
    'orders.viewDetails': 'বিস্তারিত দেখুন',

    // Profile
    'profile.title': 'আমার প্রোফাইল',
    'profile.editProfile': 'প্রোফাইল সম্পাদনা',
    'profile.logout': 'লগআউট',
    'profile.orders': 'আমার অর্ডার',
    'profile.address': 'ঠিকানা',
    'profile.support': 'সহায়তা',
    'profile.language': 'ভাষা',

    // Category / Product
    'product.addToCart': 'যোগ করুন',
    'product.outOfStock': 'স্টক নেই',
    'product.off': 'ছাড়',
    'product.inCart': 'কার্টে আছে',
    'category.allProducts': 'সব পণ্য',
    'category.noProducts': 'কোন পণ্য পাওয়া যায়নি',

    // Toast / Error messages
    'toast.loginSuccess': 'স্বাগতম! 👋',
    'toast.signupSuccess': 'Smart Bazar এ স্বাগতম! 🎉',
    'toast.fillAllFields': 'সব ঘর পূরণ করুন',
    'toast.passwordShort': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে',
    'toast.emailExists': 'ইমেইল ইতিমধ্যে নিবন্ধিত',
    'toast.invalidCredentials': 'ইমেইল বা পাসওয়ার্ড সঠিক নয়',
    'toast.tooManyAttempts': 'অনেকবার চেষ্টা করেছেন। পরে চেষ্টা করুন।',
    'toast.loginFailed': 'লগইন হয়নি। সংযোগ পরীক্ষা করুন।',
    'toast.resetSent': 'রিসেট লিংক পাঠানো হয়েছে! ইনবক্স দেখুন।',
    'toast.enterEmail': 'ইমেইল দিন',
    'toast.noAccount': 'এই ইমেইলে কোন অ্যাকাউন্ট নেই',
    'toast.resetFailed': 'রিসেট ইমেইল পাঠানো যায়নি',
    'toast.loading': 'Smart Bazar লোড হচ্ছে…',

    // Maintenance
    'maintenance.title': 'রক্ষণাবেক্ষণ চলছে',
    'maintenance.back': 'আমরা শীঘ্রই ফিরে আসব। ধন্যবাদ! 🙏',
  },
};

export function getTranslation(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}
