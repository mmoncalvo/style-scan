import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

async function run() {
  const apiKey = 'sk-ZNLWRaQa5-GCfRrTrNoQRH7i6-ITIkwBK7rvomuv6XwpFw2UjqOCo24jl5qYLyXm';
  const baseUrl = 'https://yce-api-01.makeupar.com/s2s/v2.0';

  console.log("Creando archivo falso...");
  fs.writeFileSync('dummy.jpg', 'fake image data');

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream('dummy.jpg'));
    
    // Attempt file upload
    console.log("Uploading file...");
    const res = await axios.post(`${baseUrl}/file`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`
      }
    });
    console.log("Upload success:", res.data);
  } catch (err: any) {
    console.log("Upload error:", err.response ? err.response.data : err.message);
  }
}
run();
