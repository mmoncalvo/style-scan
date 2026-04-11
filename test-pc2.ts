import axios from 'axios';
import fs from 'fs';

async function run() {
  const apiKey = 'sk-ZNLWRaQa5-GCfRrTrNoQRH7i6-ITIkwBK7rvomuv6XwpFw2UjqOCo24jl5qYLyXm';
  const baseUrl = 'https://yce-api-01.makeupar.com/s2s/v2.0';

  // Read the actual image the user tried to upload if it exists, or create dummy
  // Assuming there's a dummy image
  console.log("Creando archivo de pureba falso...");
  fs.writeFileSync('dummy.jpg', 'fake image data');
  const base64Image = fs.readFileSync('dummy.jpg').toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  try {
    console.log("Analyzing file...");
    const res = await axios.post(`${baseUrl}/task/skin-analysis`, {
      src_file_url: dataUri,
      dst_actions: [
          "wrinkle","pore","texture","acne","oiliness","eye_bag","age_spot",
          "dark_circle_v2","droopy_upper_eyelid","droopy_lower_eyelid",
          "moisture","redness","skin_type"
      ]
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    console.log("Analysis success:", res.data);
  } catch (err: any) {
    if (err.response) {
      console.log("Analysis error:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.log("Analysis error:", err.message);
    }
  }
}
run();
