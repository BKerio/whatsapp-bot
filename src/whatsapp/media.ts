import { readFile } from "fs/promises";
import path from "path";
import axios, { isAxiosError } from "axios";
import { env } from "@/env";

const API_BASE = `https://graph.facebook.com/v20.0/${env.phoneNumberId}`;

async function uploadMedia(filePath: string, mimeType: string): Promise<string> {
  const buffer = await readFile(filePath);
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([buffer], { type: mimeType }), path.basename(filePath));

  const response = await fetch(`${API_BASE}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Media upload failed: ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

export async function sendDocument(
  to: string,
  filePath: string,
  filename: string,
  caption?: string
): Promise<void> {
  const mediaId = await uploadMedia(filePath, "application/pdf");

  try {
    const res = await axios.post(
      `${API_BASE}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: {
          id: mediaId,
          filename,
          ...(caption ? { caption } : {}),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${env.token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Document sent to ${to}:`, res.data);
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      console.error("WhatsApp document error:", err.response?.data ?? err.message);
    }
    throw err;
  }
}
