// Use a cacheName for cache versioning
var cacheName = 'v1:static';

// During the installation phase, you'll usually want to cache static assets.
self.addEventListener('install', function(e) {
    // Once the service worker is installed, go ahead and fetch the resources to make this work offline.
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache
                .addAll([
                    'https://community-installer-34dac.firebaseapp.com/content/css/main_mdb.css',
                    'https://community-installer-34dac.firebaseapp.com/content/css/main_web.css',
                    'https://community-installer-34dac.firebaseapp.com/content/js/awesome_file.js',
                    'https://community-installer-34dac.firebaseapp.com/content/configs/secret_sauce.js',
                    'https://fonts.googleapis.com/css?family=Roboto:100,100i,300,300i,400,400i,500,700,700i&amp;subset=cyrillic-ext',
                    'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css',
                    'https://use.fontawesome.com/a81eef09c0.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.13.0/umd/popper.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/wow/1.1.2/wow.min.js',
                    'https://static.firebase.com/v0/firebase.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js',
                    'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/mdbootstrap/4.5.0/js/mdb.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/jquery-timeago/1.6.1/jquery.timeago.min.js'
                ])
                .then(function() {
                    self.skipWaiting();
                });
        })
    );
});

// when the browser fetches a URL…
self.addEventListener('fetch', function(event) {
    // … either respond with the cached object or go ahead and fetch the actual URL
    event.respondWith(
        caches.match(event.request).then(function(response) {
            if (response) {
                // retrieve from cache
                return response;
            }
            // fetch as normal
            return fetch(event.request);
        })
    );
});