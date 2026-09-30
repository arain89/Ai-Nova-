import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================
   GEMINI
========================================= */

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

/*
   Models to try.
   If one is temporarily unavailable,
   Nova will try the next model.
*/
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

/* =========================================
   NOVA PERSONALITY
========================================= */

const systemInstruction = `
You are Nova, a professional, friendly and helpful AI assistant.

Answer the user's request directly and naturally.

You can:
- answer questions
- explain topics
- write stories
- write code
- debug code
- translate text
- help with websites
- help with business ideas
- help with creative tasks

If the user asks for a story, actually write the story.

If the user asks a technical question,
give practical and working guidance.

Keep answers clear and useful.

If the user speaks Roman Urdu, Urdu, Hindi or English,
respond naturally in the same language style.

Do not repeatedly say that you are an AI.
`;

/* =========================================
   EXPRESS
========================================= */

app.use(cors());
app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

/* =========================================
   CHAT SESSIONS
========================================= */

const chatSessions = new Map();

function createSession(chatId, model) {

  const session = gemini.chats.create({
    model: model,

    config: {
      systemInstruction
    }
  });

  const data = {
    session,
    model
  };

  chatSessions.set(chatId, data);

  return data;
}

function getSession(chatId) {

  const existing = chatSessions.get(chatId);

  if (existing) {
    return existing;
  }

  return createSession(
    chatId,
    MODELS[0]
  );
}

/* =========================================
   WAIT
========================================= */

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/* =========================================
   SEND MESSAGE
========================================= */

async function sendToGemini(
  chatId,
  message
) {

  let lastError = null;

  /*
     Try each model.
  */

  for (const model of MODELS) {

    let chatData = getSession(chatId);

    /*
       If current session uses another model,
       create a new session.
    */

    if (chatData.model !== model) {

      console.log(
        `Switching Nova to: ${model}`
      );

      chatData =
        createSession(
          chatId,
          model
        );
    }

    const chat =
      chatData.session;

    /*
       Try current model twice.
    */

    for (
      let attempt = 1;
      attempt <= 2;
      attempt++
    ) {

      try {

        console.log(
          `Model: ${model} | Attempt: ${attempt}/2`
        );

        const response =
          await chat.sendMessage({
            message
          });

        /*
           Save successful session.
        */

        chatSessions.set(
          chatId,
          {
            session: chat,
            model
          }
        );

        return response;

      } catch (error) {

        lastError = error;

        console.error(
          `Gemini error (${model}):`,
          error?.message || error
        );

        const status =
          error?.status;

        const errorText =
          String(
            error?.message || error
          );

        /*
           Gemini busy / rate limit.
        */

        if (
          status === 503 ||
          status === 429 ||
          status === 500
        ) {

          if (attempt === 1) {

            console.log(
              "Gemini temporarily busy. Retrying..."
            );

            await wait(2500);

            continue;
          }

          console.log(
            `${model} unavailable. Trying next model...`
          );

          break;
        }

        /*
           Internet / DNS problem.
        */

        if (
          errorText.includes("ENOTFOUND") ||
          errorText.includes("fetch failed")
        ) {

          if (attempt === 1) {

            console.log(
              "Network problem. Retrying..."
            );

            await wait(2000);

            continue;
          }

          console.log(
            "Network problem still exists."
          );

          break;
        }

        /*
           API key or other permanent error.
        */

        throw error;
      }
    }
  }

  throw (
    lastError ||
    new Error(
      "All Gemini models failed."
    )
  );
}

/* =========================================
   CHAT API
========================================= */

app.post(
  "/api/chat",
  async (req, res) => {

    try {

      const {
        message,
        chatId
      } = req.body;

      if (
        !message ||
        !message.trim()
      ) {

        return res.status(400).json({
          error: "Message is required."
        });
      }

      if (!chatId) {

        return res.status(400).json({
          error: "Chat ID is required."
        });
      }

      const userMessage =
        message.trim();

      console.log("");
      console.log("==============================");
      console.log("Chat:", chatId);
      console.log("User:", userMessage);

      const response =
        await sendToGemini(
          chatId,
          userMessage
        );

      const reply =
        response?.text;

      console.log(
        "Nova:",
        reply
      );

      console.log("==============================");

      return res.json({
        reply:
          reply ||
          "Nova could not generate a response."
      });

    } catch (error) {

      console.error("");
      console.error("==============================");
      console.error("NOVA ERROR:");
      console.error(error);
      console.error("==============================");

      let message =
        "Nova is temporarily unavailable. Please try again.";

      if (error?.status === 401) {

        message =
          "Gemini API key is invalid or missing.";
      }

      else if (error?.status === 403) {

        message =
          "Gemini API access was denied.";
      }

      else if (error?.status === 429) {

        message =
          "Gemini is receiving too many requests. Please wait a moment.";
      }

      else if (error?.status === 503) {

        message =
          "Gemini is temporarily busy. Please try again shortly.";
      }

      else if (
        String(error?.message)
          .includes("ENOTFOUND")
      ) {

        message =
          "Nova cannot connect to Gemini. Check your internet connection.";
      }

      return res.status(500).json({
        error: message
      });
    }
  }
);

/* =========================================
   NEW CHAT
========================================= */

app.post(
  "/api/new-chat",
  (req, res) => {

    try {

      const { chatId } =
        req.body;

      if (!chatId) {

        return res.status(400).json({
          error: "Chat ID is required."
        });
      }

      createSession(
        chatId,
        MODELS[0]
      );

      console.log(
        "New Nova chat:",
        chatId
      );

      return res.json({
        success: true,
        message: "New chat started."
      });

    } catch (error) {

      console.error(
        "NEW CHAT ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Could not start a new chat."
      });
    }
  }
);

/* =========================================
   SERVER
========================================= */

app.listen(
  PORT,
  () => {

    console.log("");
    console.log(
      "================================"
    );

    console.log(
      `Nova running at http://localhost:${PORT}`
    );

    console.log(
      "Models:",
      MODELS.join(", ")
    );

    console.log(
      "================================"
    );
  }
);