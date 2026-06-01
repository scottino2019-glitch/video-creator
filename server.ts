import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Init Gemini client if key is present
let ai: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini client initialized successfully.");
  } catch (err) {
    console.error("Error initializing Gemini client:", err);
  }
} else {
  console.log("No GEMINI_API_KEY environment variable found. Fallback/Mock mode enabled.");
}

// Convert 16-bit Mono 24kHz raw PCM to WAV Format
function pcmToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const wavHeader = Buffer.alloc(44);
  
  // "RIFF"
  wavHeader.write('RIFF', 0);
  // File size - 8
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  // "WAVE"
  wavHeader.write('WAVE', 8);
  
  // "fmt " chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  wavHeader.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
  wavHeader.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  wavHeader.writeUInt16LE(2, 32); // BlockAlign (NumChannels * BitsPerSample/8)
  wavHeader.writeUInt16LE(16, 34); // BitsPerSample (16-bit)
  
  // "data" chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40); // Subchunk2Size
  
  const totalBuffer = Buffer.concat([wavHeader, pcmBuffer]);
  return totalBuffer.toString('base64');
}

// REST API Routes

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: "ok", mode: ai ? "ai" : "mock" });
});

/**
 * POST /api/generate-story
 * Generates structured narrative chapters, timing, subtitles and image prompts
 */
app.post('/api/generate-story', async (req, res) => {
  const { prompt, style, length = "medium" } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Proprietà 'prompt' mancante." });
  }

  const promptItalian = `
Crea una storia o video clip a tappe basato sul seguente tema: "${prompt}"
Stile narrativo/Regia: ${style || 'narrativo, emozionante'}
Lunghezza: ${length === 'short' ? '3 slide (+- 20 secondi)' : length === 'long' ? '7 slide (+- 55 secondi)' : '5 slide (+- 35 secondi)'}

Genera un elenco sequenziale e ordinato di passaggi (slide/scene).
Ogni scena deve avere:
1. 'startTime' e 'endTime': espressi in secondi, crescenti e sequenziali (ad esempio Slide 1: 0 a 7, Slide 2: 7 a 15, ecc.). Ogni slide deve durare tra i 6 e i 10 secondi per consentire una narrazione adeguata.
2. 'text': il testo del sottotitolo o didascalia (in Italiano), massimo 20 parole, accattivante e coinciso da sovrapporre al video.
3. 'narrationText': la narrazione estesa parlata (in Italiano), circa 15-30 parole, scritta per essere recitata da una voce fuori campo. Deve corrispondere ed espandere il testo in 'text'.
4. 'imagePrompt': una descrizione visiva dettagliata della scena in INGLESE per un modello di generazione d'immagini (stile coerente con lo stile narrativo, es. cinematografico, fantasy scolpito, rendering 3D, disegno a mano, ecc.).

Importante: Rispondi solo in formato JSON strutturato in base allo schema.
`;

  if (!ai) {
    console.log("No Gemini client, returning high-quality local mock story for: " + prompt);
    const mockStory = generateMockStory(prompt, style, length);
    return res.json(mockStory);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptItalian,
      config: {
        systemInstruction: "Sei un produttore video esperto, sceneggiatore e regista di animazione. Generi storie accattivanti con didascalie sincronizzate e prompt visivi evocativi.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Un titolo accattivante ed evocativo per il video generato"
            },
            segments: {
              type: Type.ARRAY,
              description: "La lista di slide e scene cronologicamente ordinate",
              items: {
                type: Type.OBJECT,
                properties: {
                  startTime: { type: Type.NUMBER, description: "Tempo di inizio in secondi (es. 0, 8, 16...)" },
                  endTime: { type: Type.NUMBER, description: "Tempo di fine in secondi (es. 8, 16, 24...)" },
                  text: { type: Type.STRING, description: "Testo breve del sottotitolo in Italiano" },
                  narrationText: { type: Type.STRING, description: "Script completo della narrazione vocale in Italiano" },
                  imagePrompt: { type: Type.STRING, description: "Detailed visual prompt in English for image generation, describing character, lighting, environment, medium etc." }
                },
                required: ["startTime", "endTime", "text", "narrationText", "imagePrompt"]
              }
            }
          },
          required: ["title", "segments"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(textResult.trim());
    return res.json(parsed);

  } catch (error: any) {
    console.error("Gemini Story Generation failed:", error);
    // Graceful fallback to rich mock data
    const fallback = generateMockStory(prompt, style, length);
    return res.json(fallback);
  }
});

/**
 * POST /api/generate-image
 * Generates an image slice based on descriptive English prompt
 */
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt visivo mancante." });
  }

  if (!ai) {
    // Generate beautiful curated fallback stock image based on words in prompt
    const placeholderUrl = getDynamicFallbackImage(prompt);
    return res.json({ imageUrl: placeholderUrl, source: "mock-unsplash" });
  }

  try {
    console.log(`Generating image for prompt: "${prompt}"`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Detailed digital art cinematic masterpiece, highly evocative: ${prompt}` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9" // Widescreen for video slides
        }
      }
    });

    let base64Image = "";
    const candidates = response.candidates;
    if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Image) {
      return res.json({ imageUrl: `data:image/png;base64,${base64Image}`, source: "ai" });
    } else {
      throw new Error("No inlineData in image gen response parts");
    }

  } catch (error: any) {
    console.error("Gemini Image Generation failed:", error);
    const placeholderUrl = getDynamicFallbackImage(prompt);
    return res.json({ imageUrl: placeholderUrl, source: "fallback-stock" });
  }
});

/**
 * POST /api/generate-audio
 * Generates a TTS narrated voice track for a text snippet using gemini-3.1-flash-tts-preview
 */
app.post('/api/generate-audio', async (req, res) => {
  const { text, voice } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Testo della narrazione mancante." });
  }

  const voiceName = voice || 'Kore';

  if (!ai) {
    console.log("No Gemini client for TTS, client-side synthesized voice fallback will occur.");
    return res.json({ audioUrl: null, fallback: true });
  }

  try {
    console.log(`Generating TTS for narration: "${text.substring(0, 30)}..." using voice ${voiceName}`);
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Leggi con tono chiaro, naturale e naturalezza espressiva in lingua italiana: "${text}"` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }
          }
        }
      }
    });

    let base64Pcm = "";
    const candidates = response.candidates;
    if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Pcm = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Pcm) {
      // Convert raw PCM to browser-playable WAV file
      const wavBase64 = pcmToWavBase64(base64Pcm, 24000);
      return res.json({ audioUrl: `data:audio/wav;base64,${wavBase64}`, fallback: false });
    } else {
      throw new Error("No audio inlineData found in response candidates");
    }

  } catch (error: any) {
    console.error("Gemini TTS Generation failed:", error);
    return res.json({ audioUrl: null, fallback: true });
  }
});

// Mock story generator fallback
function generateMockStory(topic: string, style: string, lengthStatus: string) {
  const title = `Viaggio in: ${topic}`;
  const normalized = topic.toLowerCase();
  
  // Decide some themes
  let prompts: string[] = [];
  let narrations: string[] = [];
  let subtitles: string[] = [];
  let imageTags: string[] = [];

  if (normalized.includes("spazio") || normalized.includes("space") || normalized.includes("astron") || normalized.includes("stelle")) {
    subtitles = [
      "L'immensità sconosciuta ci attende.",
      "Navi d'acciaio solcano il buio cosmico.",
      "Una nuova stella illumina la nostra rotta.",
      "Atterriamo su un pianeta dalle sabbie rosse.",
      "Un infinito abbraccio di stelle e galassie."
    ];
    narrations = [
      "Fin dall'inizio dei tempi, l'essere umano ha guardato il cielo stellato chiedendosi cosa ci fosse oltre l'orizzonte. Oggi, siamo pronti a scoprirlo.",
      "Le nostre astronavi viaggiano silenziose nell'oscurità cosmica, motori a fusione splendono come piccoli soli artificiali tra le costellazioni antiche.",
      "Superando nebulose color lavanda e nubi interstellari, avvistiamo una pulsar brillante. È il faro che guida la nostra ricerca scientifica.",
      "Scendiamo lentamente sul suolo alieno. Le sabbie rosse si alzano intorno ai moduli, mentre due lune tramontano dietro a vulcani addormentati.",
      "Mentre ammiriamo l'infinito dal ponte di comando, comprendiamo che questo non è un viaggio di sola andata, ma il cammino della nostra specie."
    ];
    imageTags = ["nebula", "spaceship", "pulsar", "mars-planet", "astronaut"];
    prompts = [
      "A mysterious interstellar nebula, dramatic purple and orange clouds, photorealistic sci-fi scene",
      "Sleek futuristic spaceship cruising through silent deep space, engines glowing ice blue",
      "A glowing bright blue pulsar star radiating energy beams across dynamic comic cosmic space",
      "Astronaut landing on a dusty red planet, towering canyons in background, twin alien moons on the sky",
      "Wide shot of an astronaut looking at the spiral Milky Way galaxy, cosmic background, emotional atmosphere"
    ];
  } else if (normalized.includes("bosco") || normalized.includes("natura") || normalized.includes("foresta") || normalized.includes("alber")) {
    subtitles = [
      "Il silenzio magico dei sentieri verdi.",
      "Sorgenti segrete custodiscono antichi segreti.",
      "La flora risplende di magica bioluminescenza.",
      "Creature fatate si nascondono nell'ombra.",
      "La pace della foresta rigenera l'anima."
    ];
    narrations = [
      "Camminare nel cuore della foresta significa ascoltare il respiro della Terra. Ogni foglia esprime un'antica saggezza sussurrata al vento.",
      "Seguendo un antico ruscello d'acqua cristallina, troviamo una radura dove il tempo sembra essersi fermato millenni fa.",
      "Quando scende la sera, i fiori selvatici iniziano a brillare di una luce azzurra bioluminescente, svelando un labirinto incantato.",
      "Tra i rami di quercia nodosi, ombre delicate fuggono rapide. Sono spiriti del bosco che custodiscono la sorgente dell'equilibrio.",
      "Sdraiarsi sul muschio soffice rimette in contatto ogni fibra del nostro corpo con l'armonia originaria dell'universo naturale."
    ];
    imageTags = ["forest-sunlight", "magic-stream", "bioluminescent-mushrooms", "deer-fairy", "forest-canopy"];
    prompts = [
      "Enchanted forest misty trails, golden sunlight rays piercing through thick green leaves",
      "Magical crystalline water stream flowing surrounded by mossy old stones and wildflowers",
      "Night forest floor filled with giant bioluminescent glowing mushrooms, magical fantasy vibe",
      "A mystical deer with glowing antlers looking out from a dark forest glade, watercolor artistic style",
      "Sunlight filtering through massive ancient redwood tree canopy, look-up view, awe-inspiring nature"
    ];
  } else {
    // Default general tale
    subtitles = [
      "Un'idea prende forma nella mente.",
      "La fatica apre la porta dell'ingegno.",
      "L'ispirazione si trasforma in capolavoro.",
      "La condivisione dà vita a nuovi legami.",
      "L'opera conclusa ispira il futuro."
    ];
    narrations = [
      "Qualsiasi grande conquista inizia con una semplice, nitida visione. Un pensiero che accende la motivazione e la creatività.",
      "Il cammino del creatore è lastricato di sfide. Ma ogni ostacolo superato affila il nostro ingegno e rafforza il nostro spirito.",
      "All'improvviso, i pezzi del puzzle si incastrano alla perfezione. L'ispirazione pura fluisce libera, dando vita a forme armoniose.",
      "Quando mostriamo il nostro lavoro agli altri, l'arte diventa un ponte. Condividiamo emozioni, passioni e sogni diversi.",
      "L'opera ora vive di vita propria. È una scintilla pronta a viaggiare nel mondo per ispirare la prossima generazione di menti brillanti."
    ];
    imageTags = ["creative-sketch", "hard-work-details", "colorful-explosion", "group-collaboration", "glowing-creative-core"];
    prompts = [
      "A brilliant designer sketching in an industrial minimalist office, soft desk light, warm creative ambience",
      "Hands focusing on intricate wood carvings, dust particles flying, macro photographic shot, high contrast",
      "Abstract vibrant colorful paint explosion, dynamic artistic splash, emotional energy vector style",
      "A diverse group of happy friends looking at a big beautiful gallery wall, bright open space, modern interior",
      "A beautifully crafted glowing crystal orrery sphere sitting on a rich dark oak table, magical ambient depth"
    ];
  }

  // Adjust number of slides based on lengthStatus
  let count = 5;
  if (lengthStatus === 'short') count = 3;
  if (lengthStatus === 'long') count = 7;

  const finalSegments = [];
  const durationPerSegment = Math.round(40 / count); // e.g. 8s per segment
  
  for (let i = 0; i < count; i++) {
    const sIndex = i % subtitles.length;
    const sTime = i * durationPerSegment;
    const eTime = (i + 1) * durationPerSegment;
    
    finalSegments.push({
      startTime: sTime,
      endTime: eTime,
      text: subtitles[sIndex],
      narrationText: narrations[sIndex],
      imagePrompt: prompts[sIndex]
    });
  }

  return {
    title,
    segments: finalSegments
  };
}

// Helper to provide a stable, keyword-based beautiful fallback image URL
function getDynamicFallbackImage(prompt: string): string {
  const normalized = prompt.toLowerCase();
  let searchWord = "nature";
  if (normalized.includes("nebula") || normalized.includes("space") || normalized.includes("star") || normalized.includes("galaxy") || normalized.includes("astron")) {
    searchWord = "nebula";
  } else if (normalized.includes("ship") || normalized.includes("flight") || normalized.includes("craft")) {
    searchWord = "spaceship";
  } else if (normalized.includes("forest") || normalized.includes("wood") || normalized.includes("tree")) {
    searchWord = "forest";
  } else if (normalized.includes("ocean") || normalized.includes("sea") || normalized.includes("water") || normalized.includes("wave")) {
    searchWord = "ocean";
  } else if (normalized.includes("cyberpunk") || normalized.includes("neon") || normalized.includes("hologram") || normalized.includes("robot")) {
    searchWord = "cyberpunk";
  } else if (normalized.includes("ancient") || normalized.includes("castle") || normalized.includes("fantasy")) {
    searchWord = "castle";
  } else if (normalized.includes("sketch") || normalized.includes("art") || normalized.includes("work")) {
    searchWord = "creative";
  } else {
    // extract any 5-letter or longer words excluding common short ones
    const words = normalized.replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 4);
    if (words.length > 0) {
      searchWord = words[0];
    }
  }

  // Use elegant Picsum photos or a curated list of reliable Unsplash image presets
  const randomId = Math.floor(Math.random() * 1000);
  return `https://picsum.photos/seed/${searchWord}_${randomId}/960/540`;
}

// Serve Vite dev server or build static folder
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Use vite's middlewares to handle static assets
    app.use(vite.middlewares);
    console.log("Mounted Vite middleware for development.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static production files from dist.");
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
