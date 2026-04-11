import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
async function testPolling() {
  const actualKey = process.env.PERFECT_CORP_API_KEY;
  const taskId = '3pJzxFJFLnyKxjepv4sqzjhFmCKJQMyJPHqqs-o9UrlNUHfIUbS-IGVJeJRQiYUi';
  const urlsToTest = [
    { method: 'get', url: `https://yce-api-01.makeupar.com/s2s/v2.0/task/skin-analysis/${taskId}` },
    { method: 'get', url: `https://yce-api-01.makeupar.com/s2s/v2.0/task/skin_analysis/${taskId}` },
    { method: 'post', url: `https://yce-api-01.makeupar.com/s2s/v2.0/task/${taskId}` },
    { method: 'get', url: `https://yce-api-01.makeupar.com/s2s/v2.0/task/poll/${taskId}` },
  ];
  for (const { method, url } of urlsToTest) {
    try {
      let res;
      if (method === 'get') {
        res = await axios.get(url, { headers: { Authorization: `Bearer ${actualKey}` } });
      } else {
        res = await axios.post(url, {}, { headers: { Authorization: `Bearer ${actualKey}` } });
      }
      console.log(`>>> SUCCESSFUL URL: ${url}`);
      return; 
    } catch (err: any) {
      // ignore
    }
  }
  console.log("None succeeded.");
}
testPolling();
