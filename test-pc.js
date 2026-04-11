const axios = require('axios');
const fs = require('fs');

async function run() {
  const apiKey = 'sk-ZNLWRaQa5-GCfRrTrNoQRH7i6-ITIkwBK7rvomuv6XwpFw2UjqOCo24jl5qYLyXm';
  const baseUrl = 'https://yce-api-01.makeupar.com/s2s/v2.0';

  console.log("Creating dummy file...");
  fs.writeFileSync('dummy.jpg', 'fake image data');

  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream('dummy.jpg'));
    
    // Try uploading file
    console.log("Uploading file...");
    const res = await axios.post(`${baseUrl}/file`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`
      }
    });
    console.log("Upload success:", res.data);
  } catch (err) {
    console.log("Upload error:", err.response ? err.response.data : err.message);
  }
}
run();
