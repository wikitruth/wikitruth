'use strict';

type FormValue = string | number | boolean | null | undefined;
type FormPayload = Record<string, FormValue>;

interface HttpPostResult<TBody = unknown> {
  statusCode: number;
  body: TBody | null;
}

function toUrlEncoded(formData: FormPayload): URLSearchParams {
  const params = new URLSearchParams();
  Object.keys(formData).forEach(function (key) {
    const value = formData[key];
    if (value === undefined || value === null) {
      return;
    }

    params.append(key, String(value));
  });

  return params;
}

async function postForm<TBody = unknown>(url: string, formData: FormPayload): Promise<HttpPostResult<TBody>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: toUrlEncoded(formData),
  });

  let body: TBody | null = null;
  try {
    body = (await response.json()) as TBody;
  } catch (_error) {
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
