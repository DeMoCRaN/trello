function statusPageHandler(req, res) {
  res.send(
    '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
      '<meta charset="UTF-8" />' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
      '<title>Backend Status</title>' +
      '<style>' +
        'body {' +
          'font-family: Arial, sans-serif;' +
          'background: #f0f4f8;' +
          'display: flex;' +
          'justify-content: center;' +
          'align-items: center;' +
          'height: 100vh;' +
          'margin: 0;' +
        '}' +
        '.status-container {' +
          'background: white;' +
          'padding: 2rem 3rem;' +
          'border-radius: 8px;' +
          'box-shadow: 0 4px 12px rgba(0,0,0,0.1);' +
          'text-align: center;' +
        '}' +
        '.status-container h1 {' +
          'color: #4caf50;' +
          'margin-bottom: 0.5rem;' +
        '}' +
        '.status-container p {' +
          'color: #555;' +
          'font-size: 1.2rem;' +
        '}' +
      '</style>' +
    '</head>' +
    '<body>' +
      '<div class="status-container">' +
        '<h1>Status: Running</h1>' +
        '<p>Your backend server is up and running smoothly.</p>' +
      '</div>' +
    '</body>' +
    '</html>'
  );
}

module.exports = statusPageHandler;
