Albrecht website with Firebase-backed swap tools

Files:
- index.html = product list page
- swap.html = swap checker
- employees.html = employee setup
- swap-style.css = shared styling for swap pages
- firebase-shared.js = shared Firebase config
- swap-app.js = swap checker logic
- employees-page.js = employee setup logic

What changed:
- Employee Setup now saves to Firebase at /employees
- Swap Checker now reads employee names from Firebase in real time
- Product list continues using the same Firebase project and same CDN libraries

Important limitation:
- The swap day schedule itself is still temporary on the page and is not saved to Firebase yet
- Employee import can create duplicates if the imported JSON repeats existing names with different casing or timing of writes
