import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Zap,
  Ghost,
  Search,
  Sparkles,
  ChevronRight,
  Terminal,
  XCircle,
  Save,
} from "lucide-react";

// --- Configuration & Constants ---
const GENRES = [
  {
    id: "scifi",
    label: "Sci-Fi",
    icon: Zap,
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-950/30",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    icon: BookOpen,
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-950/30",
  },
  {
    id: "horror",
    label: "Horror",
    icon: Ghost,
    color: "text-red-500",
    border: "border-red-500/30",
    bg: "bg-red-950/30",
  },
  {
    id: "mystery",
    label: "Mystery",
    icon: Search,
    color: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-950/30",
  },
];

const LOADING_MESSAGES = {
  scifi: [
    "Initializing neural link...",
    "Decrypting narrative stream...",
    "Rendering cyber-structures...",
    "Compiling future timelines...",
    "Syncing with the mainframe...",
  ],
  fantasy: [
    "Consulting the ancient scrolls...",
    "Summoning the narrative spirits...",
    "Polishing the crystal ball...",
    "Weaving the threads of fate...",
    "Brewing potions of imagination...",
  ],
  horror: [
    "Checking under the bed...",
    "Listening to the whispers...",
    "Something is approaching...",
    "Manifesting your fears...",
    "Don't look behind you...",
  ],
  mystery: [
    "Gathering clues...",
    "Dusting for fingerprints...",
    "Connecting the dots...",
    "Questioning the witnesses...",
    "Following the trail...",
  ],
  default: [
    "Loading next chapter...",
    "Writing your destiny...",
    "Thinking...",
  ],
};

const MAX_CHAPTERS = 5;
const SCENES_PER_CHAPTER = 5;
const CHAR_TARGET = 700;
const STORAGE_KEY = "story_app_save_v1";

// --- Helper: Robust Typewriter Hook ---
const useTypewriter = (text, speed = 1, onComplete) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const animationRef = useRef(null);
  const textRef = useRef(text);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!text) return;

    textRef.current = text;
    setDisplayedText("");
    setIsTyping(true);

    let currentIndex = 0;
    let lastTime = Date.now();

    const tick = () => {
      if (!textRef.current) return;

      const now = Date.now();

      if (now - lastTime >= speed) {
        const chunk = 1;
        const nextIndex = Math.min(
          currentIndex + chunk,
          textRef.current.length
        );

        setDisplayedText(textRef.current.substring(0, nextIndex));
        currentIndex = nextIndex;
        lastTime = now;
      }

      if (currentIndex < textRef.current.length) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        setIsTyping(false);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [text, speed]);

  const skip = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setDisplayedText(text);
    setIsTyping(false);
    if (onCompleteRef.current) onCompleteRef.current();
  };

  return { displayedText, isTyping, skip };
};

// --- Main Application Component ---
export default function StoryApp() {
  const [gameState, setGameState] = useState("loading_save");
  const [genre, setGenre] = useState(null);
  const [storyTitle, setStoryTitle] = useState("");
  const [history, setHistory] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Progress Tracking
  const [chapter, setChapter] = useState(1);
  const [scene, setScene] = useState(1);

  // UI States
  const [showOptions, setShowOptions] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // ---------------------------------------------------------
  // IMPORTANT: This pulls the key from your .env file
  // ---------------------------------------------------------
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // --- Persistence Effect ---
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.gameState === "playing" && parsed.currentData) {
          setGenre(parsed.genre);
          setStoryTitle(parsed.storyTitle);
          setHistory(parsed.history);
          setCurrentData(parsed.currentData);
          setChapter(parsed.chapter);
          setScene(parsed.scene);
          setGameState("playing");
          setShowOptions(true);
        } else {
          setGameState("welcome");
        }
      } catch (e) {
        console.error("Save file corrupted", e);
        setGameState("welcome");
      }
    } else {
      setGameState("welcome");
    }
  }, []);

  useEffect(() => {
    if (gameState === "playing" || gameState === "error") {
      const stateToSave = {
        gameState,
        genre,
        storyTitle,
        history,
        currentData,
        chapter,
        scene,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [gameState, genre, storyTitle, history, currentData, chapter, scene]);

  // --- Loading Message Cycler ---
  useEffect(() => {
    if (!isLoading || !genre) return;

    const msgs = LOADING_MESSAGES[genre.id] || LOADING_MESSAGES.default;
    let index = 0;
    setLoadingMsg(msgs[0]);

    const interval = setInterval(() => {
      index = (index + 1) % msgs.length;
      setLoadingMsg(msgs[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading, genre]);

  // --- API Interaction ---
  const generateStorySegment = async (selectedOption = null) => {
    setIsLoading(true);
    setShowOptions(false);
    setErrorMsg("");

    try {
      let prompt = "";
      const isEnding = chapter === MAX_CHAPTERS && scene === SCENES_PER_CHAPTER;

      if (history.length === 0) {
        prompt = `
          You are an interactive storyteller. 
          Genre: ${genre.label}. 
          Task: Write the opening scene (Chapter 1, Scene 1) of a story.
          Length: Approximately ${CHAR_TARGET} characters.
          Format: Valid JSON.
          Structure:
          {
            "title": "A short, creative title for this story",
            "story": "The narrative text...",
            "options": ["Choice A text", "Choice B text"]
          }
          Make the story engaging, descriptive, and immersive.
        `;
      } else {
        prompt = `
          Continue the story.
          Current Progress: Chapter ${chapter}, Scene ${scene}.
          Previous Context Summary: ${history
            .slice(-3)
            .map((h) => h.text)
            .join(" ")}...
          The user just chose: "${selectedOption}".
          
          ${
            isEnding
              ? `Write the GRAND FINALE (Chapter 5, Scene 5). Wrap up the story based on choices. Length: ${CHAR_TARGET} chars. Provide NO options, pass an empty array.`
              : `Write the next scene. Length: ${CHAR_TARGET} chars. Provide 2 distinct choices for the protagonist.`
          }

          Output STRICT JSON:
          {
            "story": "The narrative text...",
            "options": ${isEnding ? "[]" : '["Choice A", "Choice B"]'}
          }
        `;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `API Error ${response.status}: ${errText.substring(0, 100)}`
        );
      }

      const jsonText = await response.text();
      if (!jsonText || jsonText.trim() === "")
        throw new Error("Empty response");

      const data = JSON.parse(jsonText);
      if (!data.candidates || !data.candidates[0].content)
        throw new Error("Failed to generate content");

      let rawText = data.candidates[0].content.parts[0].text;
      if (rawText) {
        rawText = rawText
          .replace(/^```json\s*/, "")
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "")
          .trim();
      }

      let parsedData;
      try {
        parsedData = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error("Received malformed data.");
      }

      if (parsedData.title && history.length === 0) {
        setStoryTitle(parsedData.title);
      }

      setCurrentData(parsedData);

      setHistory((prev) => [
        ...prev,
        {
          role: "user",
          text: selectedOption
            ? `User chose: ${selectedOption}`
            : "Start story",
        },
        { role: "model", text: parsedData.story },
      ]);

      setGameState("playing");
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message);
      setGameState("error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---
  const handleGenreSelect = (selectedGenre) => {
    setGenre(selectedGenre);
    setChapter(1);
    setScene(1);
    setHistory([]);
    setStoryTitle("");
  };

  useEffect(() => {
    if (
      genre &&
      history.length === 0 &&
      !isLoading &&
      gameState === "welcome"
    ) {
      generateStorySegment();
    }
  }, [genre]);

  const handleOptionClick = (option) => {
    let nextScene = scene + 1;
    let nextChapter = chapter;

    if (nextScene > SCENES_PER_CHAPTER) {
      nextScene = 1;
      nextChapter += 1;
    }

    setChapter(nextChapter);
    setScene(nextScene);
    generateStorySegment(option);
  };

  const triggerQuit = () => {
    setShowQuitConfirm(true);
  };

  const confirmQuit = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGameState("welcome");
    setGenre(null);
    setHistory([]);
    setChapter(1);
    setScene(1);
    setStoryTitle("");
    setCurrentData(null);
    setErrorMsg("");
    setShowQuitConfirm(false);
  };

  const resetGame = () => {
    confirmQuit();
  };

  // --- Renders ---

  if (gameState === "loading_save") {
    return (
      <div className="bg-black h-[100dvh] w-full text-white flex items-center justify-center">
        Loading save...
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div
          className={`absolute inset-0 opacity-20 animate-pulse ${
            genre ? genre.bg.replace("/30", "/80") : "bg-gray-900"
          }`}
        ></div>
        <div className="z-10 flex flex-col items-center gap-6 text-center animate-in fade-in duration-700">
          {genre && (
            <genre.icon size={64} className={`animate-bounce ${genre.color}`} />
          )}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-widest text-white">
              CHAPTER {chapter}
            </h2>
            <p
              key={loadingMsg}
              className="text-gray-400 text-sm animate-in fade-in zoom-in duration-500"
            >
              {loadingMsg}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "welcome") {
    return (
      <div className="w-full min-h-[100dvh] bg-neutral-950 text-white flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
          <div className="mb-12 text-center space-y-4">
            {/* Replaced Sparkles with Image */}
            <div className="inline-block p-4 rounded-full bg-white/5 border border-white/10 mb-4 shadow-xl">
              <img
                src="/logo.png"
                alt="App Logo"
                className="w-12 h-12 object-contain drop-shadow-lg"
              />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
              AI Tales
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-xs mx-auto">
              A dynamic storytelling engine. Your choices shape the narrative.
              Every playthrough is unique.
            </p>
          </div>

          <div className="w-full space-y-3">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 text-center">
              Select your genre
            </p>
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => handleGenreSelect(g)}
                className={`w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 group relative overflow-hidden flex items-center gap-4 text-left`}
              >
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%]`}
                />
                <div className={`p-2 rounded-lg bg-black/50 ${g.color}`}>
                  <g.icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-200">{g.label}</h3>
                  <span className="text-xs text-neutral-500">
                    Interactive Fiction
                  </span>
                </div>
                <ChevronRight
                  className="ml-auto text-neutral-600 group-hover:text-white transition-colors"
                  size={16}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 text-center text-neutral-700 text-xs font-mono">
          Powered by Gemini 1.5
        </div>
      </div>
    );
  }

  if (gameState === "error") {
    return (
      <div className="w-full h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <Terminal className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-400 mb-2">
          Narrative Collapse
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          {errorMsg || "The AI stream was interrupted. Please try again."}
        </p>
        <button
          onClick={resetGame}
          className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200"
        >
          Restart System
        </button>
      </div>
    );
  }

  // 4. Playing Screen
  return (
    <div className="w-full h-[100dvh] bg-neutral-950 text-white relative overflow-hidden flex flex-col font-sans">
      {/* Background Ambient Color */}
      {genre && (
        <div
          className={`absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-b from-${
            genre.color.split("-")[1]
          }-900 to-black`}
        ></div>
      )}

      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Quit Story?</h3>
            <p className="text-neutral-400 text-sm">
              Your progress will be lost. Are you sure you want to return to the
              main menu?
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="px-5 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors text-xs font-medium uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={confirmQuit}
                className="px-5 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 transition-colors text-xs font-medium uppercase tracking-wider"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none relative z-10 w-full max-w-md mx-auto p-4 py-4 flex justify-between items-start border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex flex-col items-start">
          <h1 className="text-lg font-bold text-blue-400 tracking-tight leading-tight">
            {storyTitle || genre?.label || "Unknown Story"}
          </h1>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 mt-1">
            <span>Chapter {chapter}</span>
          </div>
        </div>
        <button
          onClick={triggerQuit}
          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
          title="Quit Story"
        >
          <XCircle size={20} />
        </button>
      </div>

      {/* Story Content */}
      <div className="flex-1 w-full max-w-md mx-auto relative overflow-y-auto no-scrollbar scroll-smooth">
        <div className="p-6 pb-2 min-h-full">
          <StoryContent
            text={currentData?.story}
            onTypingComplete={() => setShowOptions(true)}
            isEnding={chapter === MAX_CHAPTERS && scene === SCENES_PER_CHAPTER}
            skipAnimation={showOptions}
          />
        </div>
      </div>

      {/* Options Footer - Seamless integration */}
      <div className="flex-none w-full z-20">
        <div className="max-w-md mx-auto p-4 py-4 space-y-3">
          {showOptions && currentData?.options?.length > 0 && (
            <div className="animate-slow-appear space-y-3">
              {currentData.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(opt)}
                  className="w-full py-2 px-3 text-sm bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 backdrop-blur-md text-center rounded-lg transition-all active:scale-95 flex items-center justify-center group shadow-lg"
                >
                  <span className="text-neutral-200 group-hover:text-white font-medium leading-normal">
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showOptions &&
            (!currentData?.options || currentData.options.length === 0) && (
              <div className="animate-slow-appear text-center">
                <p className="text-neutral-500 text-sm mb-4">The End.</p>
                <button
                  onClick={resetGame}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                >
                  Play Again
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// --- Story Content with Robust Typing ---
function StoryContent({ text, onTypingComplete, isEnding, skipAnimation }) {
  const { displayedText, skip } = useTypewriter(text, 30, onTypingComplete); // Speed 30ms

  const finalText = skipAnimation ? text : displayedText;

  useEffect(() => {
    if (skipAnimation && onTypingComplete) {
      onTypingComplete();
    }
  }, [skipAnimation, onTypingComplete]);

  return (
    <div className="relative" onClick={skip}>
      <p className="text-base md:text-lg leading-relaxed text-neutral-300 whitespace-pre-line font-sans">
        {finalText}
        {!skipAnimation && displayedText.length < (text?.length || 0) && (
          <span className="inline-block w-2 h-5 bg-blue-400/50 ml-1 animate-pulse align-middle" />
        )}
      </p>
      {isEnding && finalText?.length === text?.length && (
        <div className="mt-8 flex justify-center">
          <Sparkles className="text-yellow-400 animate-spin-slow w-8 h-8 opacity-50" />
        </div>
      )}
    </div>
  );
}
