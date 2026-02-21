'use strict';

function toUrlEncoded(formData) {
  const params = new URLSearchParams();
  Object.keys(formData || {}).forEach(function (key) {
    const value = formData[key];
    if (value === undefined || value === null) {
      return;
    }
    params.append(key, String(value));
  });
  return params;
}

async function postForm(url, formData) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: toUrlEncoded(formData),
  });

  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }

  return {
    statusCode: response.status,
    body: body,
  };
}

module.exports = {
  postForm: postForm,
};
