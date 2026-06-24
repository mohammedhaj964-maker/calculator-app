// تعريف اسم ومسار التخزين المؤقت
const CACHE_NAME = 'calculator-app-v1';
const RUNTIME_CACHE = 'calculator-runtime-v1';

// الملفات التي سيتم تخزينها مؤقتاً
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// حدث التثبيت (Install Event)
self.addEventListener('install', (event) => {
    console.log('Service Worker: التثبيت جاري...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: تخزين الملفات الثابتة');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: تم التثبيت بنجاح ✓');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('Service Worker: خطأ في التثبيت', err);
            })
    );
});

// حدث التنشيط (Activate Event)
self.addEventListener('activate', (event) => {
    console.log('Service Worker: التنشيط جاري...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // حذف النسخ القديمة من الكاش
                        if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                            console.log('Service Worker: حذف الكاش القديم:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: تم التنشيط بنجاح ✓');
                return self.clients.claim();
            })
    );
});

// حدث جلب الموارد (Fetch Event)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // تجاهل الطلبات غير الـ GET
    if (request.method !== 'GET') {
        return;
    }

    // تجاهل الطلبات الخارجية
    if (url.origin !== location.origin) {
        return;
    }

    // استراتيجية Cache First للملفات الثابتة
    if (
        request.destination === 'document' ||
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font' ||
        request.destination === 'image'
    ) {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    if (response) {
                        // إذا كانت الملف في الكاش، أرجعه
                        console.log('Service Worker: تقديم من الكاش:', request.url);
                        return response;
                    }

                    // إذا لم تكن في الكاش، حاول تحميلها من الإنترنت
                    return fetch(request)
                        .then((response) => {
                            // تحقق من أن الرد صحيح
                            if (!response || response.status !== 200 || response.type === 'error') {
                                return response;
                            }

                            // انسخ الرد إلى كاش جديد
                            const responseToCache = response.clone();
                            caches.open(RUNTIME_CACHE)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                });

                            return response;
                        })
                        .catch((error) => {
                            // في حالة الفشل، قدم الملف من الكاش إذا كان موجوداً
                            console.log('Service Worker: الشبكة غير متاحة، محاولة من الكاش');
                            return caches.match(request)
                                .then((cachedResponse) => {
                                    if (cachedResponse) {
                                        return cachedResponse;
                                    }
                                    // إذا لم يكن هناك كاش، أرجع صفحة خطأ
                                    return new Response(
                                        'المورد غير متاح بدون اتصال',
                                        {
                                            status: 503,
                                            statusText: 'Service Unavailable',
                                            headers: new Headers({
                                                'Content-Type': 'text/plain; charset=utf-8'
                                            })
                                        }
                                    );
                                });
                        });
                })
        );
    } else {
        // للطلبات الأخرى (مثل API calls)، استراتيجية Network First
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(RUNTIME_CACHE)
                        .then((cache) => {
                            cache.put(request, responseToCache);
                        });

                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then((response) => {
                            if (response) {
                                return response;
                            }
                            return new Response(
                                'بدون اتصال - المورد غير متاح',
                                {
                                    status: 503,
                                    statusText: 'Service Unavailable'
                                }
                            );
                        });
                })
        );
    }
});

// معالج الرسائل من التطبيق
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME);
        caches.delete(RUNTIME_CACHE);
    }
});

// معالج الأخطاء غير المتوقعة
self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled Rejection:', event.reason);
});

// معالج الأخطاء
self.addEventListener('error', (event) => {
    console.error('Service Worker: Error:', event.error);
});

// تحديث تلقائي
self.addEventListener('controllerchange', () => {
    console.log('Service Worker: تم تغيير المتحكم (Controller)');
});

console.log('Service Worker: جاهز ✓');
