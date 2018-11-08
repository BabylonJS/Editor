const Base64CSS = require('base64-css');
const fs = require('fs');

Base64CSS('./css/editor.css', null, (err, result) => {
    fs.writeFileSync('./css/editor.bundle.css', result);
    console.log('Bundles CSS available at: editor.bundle.css');
});
