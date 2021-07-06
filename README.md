Based on the card game, [Illusion](https://pandasaurusgames.com/products/illusion).

---
## PWA Configuration

- The `service-worker.js` and `manifest.json` files are in the `public` folder.
- You should update the icons in `/public/images/icons`
- For an offline experience edit the `/public/offline.html` file.
- This PWA is installable, the `/public/scripts/install.js` file has the install configuration. You should change the app name in the `logAppInstalled` function.
    Note: If you don't want to make the app installable you can remove the script from the `index.html` file in the `public` folder.
    
For more info, this template was made following this [tutorial](https://codelabs.developers.google.com/codelabs/your-first-pwapp)
