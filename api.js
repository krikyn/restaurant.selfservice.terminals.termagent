import axios from 'axios';
import {API_URL, PASSWORD, USERNAME} from "./consts.js";

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000
})

export async function fetchToken() {
  const {data} = await api.post('/api/account/login', {
    user: USERNAME,
    pass: PASSWORD
  });

  const showObject = {...data, token: undefined}

  console.log(`Login as ${JSON.stringify(showObject)} SUCCESS`);

  return data.token;
}

export async function sendScreenshot(content, token) {
  const formData = new FormData()
  formData.append('image', content)

  await api({
    method: 'post',
    url: '/api/agent/screenshot',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    params: {
      token
    },
    timeout: 60000,
    maxContentLength: Infinity
  })
}
