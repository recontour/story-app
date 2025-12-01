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
const STORAGE_KEY = "story_app_save_v3";

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

// --- Component to render the actively typing/current scene ---
function CurrentSceneRenderer({
  text,
  onTypingComplete,
  isEnding,
  currentPage,
  skipAnimation,
}) {
  // FIX: Destructure isTyping from useTypewriter hook
  const { displayedText, skip, isTyping } = useTypewriter(text, 30, () => {
    onTypingComplete();
  });

  const finalText = skipAnimation ? text : displayedText;

  useEffect(() => {
    if (skipAnimation && onTypingComplete) {
      onTypingComplete();
    }
  }, [skipAnimation, onTypingComplete]);

  // Effect to scroll to the newly appearing content when component mounts or text changes
  useEffect(() => {
    const mainScroll = document.querySelector(".story-scroll-area");
    if (mainScroll) {
      // Scroll to the TOP of the page when new text is received (the "page turn" effect)
      if (displayedText.length === 0 && text) {
        mainScroll.scrollTop = 0;
      }
      // Then, scroll to the bottom as text types out
      if (displayedText.length > 0) {
        mainScroll.scrollTop = mainScroll.scrollHeight;
      }
    }
  }, [text, displayedText.length]);

  return (
    <div className="relative" onClick={skip}>
      <p className="text-base md:text-lg leading-relaxed text-neutral-300 whitespace-pre-line font-sans">
        {finalText}
        {!skipAnimation && displayedText.length < (text?.length || 0) && (
          <span className="inline-block w-2 h-5 bg-blue-400/50 ml-1 animate-pulse align-middle" />
        )}
      </p>
      {/* Page counter at the end of the current narrative text */}
      <div className="mt-2 text-right">
        <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest">
          Page {currentPage}
        </span>
      </div>
      {isEnding && finalText?.length === text?.length && (
        <div className="mt-8 flex justify-center">
          <Sparkles className="text-yellow-400 animate-spin-slow w-8 h-8 opacity-50" />
        </div>
      )}

      {/* NEW FIX: CSS calc() spacer element to push the typing content down */}
      {isTyping && <div className="min-h-spacer" />}
    </div>
  );
}

// --- Main Application Component ---
export default function StoryApp() {
  const [gameState, setGameState] = useState("loading_save");
  const [genre, setGenre] = useState(null);
  const [storyTitle, setStoryTitle] = useState("");

  // History stores ALL narrative segments and user choices
  const [history, setHistory] = useState([]);

  // currentData stores the options for the current scene
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

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // --- Persistence Effect (Save and Load) ---
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

  // Save State on Change
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

    // Add the user's choice to history *before* calling API
    if (selectedOption) {
      setHistory((prev) => [...prev, { role: "user", text: selectedOption }]);
    }

    try {
      let prompt = "";
      const isEnding = chapter === MAX_CHAPTERS && scene === SCENES_PER_CHAPTER;

      // Filter history for model context (narrative texts + user choices)
      // We only send the last few model/user interactions to maintain context
      const context = history
        .map(
          (h) => `${h.role === "user" ? "User chose:" : "Narrative:"} ${h.text}`
        )
        .slice(-5)
        .join("\n");

      if (history.length === 0) {
        prompt = `
          You are an interactive storyteller. 
          Genre: ${genre.label}. 
          Task: Write the opening scene (Chapter 1, Scene 1) of a story.
          Length: Approximately ${CHAR_TARGET} characters.
          Format: Valid JSON.
          Keep simple engish.
          Structure:
          {
            "title": "A short, creative title for this story",
            "story": "The narrative text...",
            "options": ["Choice A text", "Choice B text"]
          }
          IMPORTANT: Ensure 'Choice A text' and 'Choice B text' are descriptive and no more than 10 words, fitting neatly on two lines in a large button container.
          Make the story engaging, descriptive, and immersive.
        `;
      } else {
        prompt = `
          Continue the story.
          Keep simple engish.
          Current Progress: Chapter ${chapter}, Scene ${scene}.
          Previous Context Summary (Most recent actions/scenes): ${context}
          
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
          IMPORTANT: Ensure 'Choice A text' and 'Choice B text' are descriptive and no more than 10 words, fitting neatly on two lines in a large button container.
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

      // Append new narrative text to history, but only store the model role text
      setHistory((prev) => [
        ...prev,
        { role: "model", text: parsedData.story },
      ]);

      // Update options/current data
      setCurrentData(parsedData);
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
    // Logic to start the story generation on genre select
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
    // 1. Calculate next step
    let nextScene = scene + 1;
    let nextChapter = chapter;

    if (nextScene > SCENES_PER_CHAPTER) {
      nextScene = 1;
      nextChapter += 1;
    }

    setChapter(nextChapter);
    setScene(nextScene);

    // 2. Generate new segment, passing the chosen option
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

  // Calculate Page Number (1-25)
  // Total narrative segments (model roles) in history
  const currentPage = history.filter((h) => h.role === "model").length;

  // Get the most recent narrative text for the typewriter.
  const currentNarrative = currentData?.story || "";

  // --- Renders ---

  if (gameState === "loading_save") {
    return (
      <div className="bg-black h-[100dvh] w-full text-white flex items-center justify-center">
        Loading save...
      </div>
    );
  }

  // FIX: Only show full screen loader for the initial genre select (history.length === 0)
  if (isLoading && history.length === 0) {
    return (
      <div className="w-full h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div
          className={`absolute inset-0 opacity-20 ${
            genre ? genre.bg.replace("/30", "/80") : "bg-gray-900"
          }`}
        ></div>
        <div className="z-10 flex flex-col items-center gap-6 text-center">
          {genre && <genre.icon size={64} className={`${genre.color}`} />}
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
    // Main container uses h-screen for fixed height
    <div className="w-full h-screen flex flex-col bg-neutral-950 text-white relative overflow-hidden font-sans">
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

      {/* Header - Fixed top bar */}
      <div className="flex-none z-10 w-full max-w-md mx-auto p-4 py-4 flex justify-between items-start border-b border-white/5 bg-black/70 backdrop-blur-md header-fixed-height">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start">
            <h1 className="text-lg font-bold text-blue-400 tracking-tight leading-tight line-clamp-1">
              {storyTitle || genre?.label || "Unknown Story"}
            </h1>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400 mt-1">
              <span>Chapter {chapter}</span>
            </div>
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

      {/* Story Content - The main scrollable area */}
      {/* Height is flexible (flex-grow), filling space between fixed header and footer */}
      <div className="flex-grow story-scroll-area w-full max-w-md mx-auto relative overflow-y-auto overflow-x-hidden pt-4">
        <div className="p-6 pb-2">
          {/* Render all previous, completed scenes */}
          {history.map((item, index) => {
            if (item.role === "model" && index < history.length - 1) {
              // Render all EXCEPT the very last model output
              // Calculate page index (1-based count of model narratives)
              const pageIndex = history
                .slice(0, index + 1)
                .filter((h) => h.role === "model").length;

              return (
                <div key={`page-${index}`} className="mb-8">
                  <p className="text-base md:text-lg leading-relaxed text-neutral-300 whitespace-pre-line font-sans">
                    {item.text}
                  </p>
                  {/* Page counter at the end of the narrative text */}
                  <div className="mt-2 text-right">
                    <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest">
                      Page {pageIndex}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })}

          {/* Render the current, actively typing scene (which is the last item in history) */}
          {history.length > 0 &&
            history[history.length - 1].role === "model" && (
              <div className="mb-2">
                <CurrentSceneRenderer
                  text={history[history.length - 1].text} // Pass the last piece of narrative text
                  onTypingComplete={() => setShowOptions(true)}
                  isEnding={
                    chapter === MAX_CHAPTERS && scene === SCENES_PER_CHAPTER
                  }
                  skipAnimation={showOptions}
                  currentPage={currentPage}
                />
              </div>
            )}

          {/* Spacer is no longer needed here as height is handled dynamically in CurrentSceneRenderer */}
        </div>
      </div>

      {/* Options Footer - Fixed bottom bar with integrated loading */}
      <div className="flex-none w-full z-20 bg-neutral-950/90 backdrop-blur-sm border-t border-white/5 story-footer footer-fixed-height">
        <div className="max-w-md mx-auto p-4 py-3 space-y-2 relative h-[140px]">
          {" "}
          {/* **FIX 1: Apply Fixed Height and Relative Positioning** */}
          {/* Integrated Loading Indicator (centered vertically) */}
          {isLoading && history.length > 0 && (
            // FIX 2: Use absolute positioning to fill the fixed height container
            <div className="absolute inset-0 text-center flex flex-col items-center justify-center animate-in fade-in duration-500 gap-3">
              {genre && (
                <genre.icon
                  size={20}
                  className={`animate-bounce ${genre.color}`}
                />
              )}
              <p key={loadingMsg} className="text-gray-400 text-sm">
                {loadingMsg}
              </p>
            </div>
          )}
          {/* Options Container: Smooth transition when typing is done */}
          {/* FIX 3: Use absolute positioning to fill the fixed height container */}
          <div
            className={`
                    transition-opacity duration-[2000ms] ease-out space-y-2 
                    ${
                      showOptions &&
                      currentData?.options?.length > 0 &&
                      !isLoading
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }
                    absolute inset-0 p-4 py-3 flex flex-col justify-center
                `}
          >
            {currentData?.options?.length > 0 && (
              <>
                {currentData.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(opt)}
                    // FIX: Reduced padding to py-2 to make buttons shorter/more compact
                    className="w-full py-2 px-3 text-sm bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 backdrop-blur-md text-center rounded-lg transition-all active:scale-95 flex items-center justify-center group shadow-lg"
                  >
                    {/* Set font to text-sm */}
                    <span className="text-neutral-200 group-hover:text-white font-medium leading-snug">
                      {opt}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
          {/* End State Container: Also use transition-opacity for smooth exit */}
          <div
            className={`
                    transition-opacity duration-[2000ms] ease-out 
                    ${
                      showOptions &&
                      (!currentData?.options ||
                        currentData.options.length === 0) &&
                      !isLoading
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }
                    absolute inset-0 p-4 py-3 flex flex-col justify-center
                 `}
          >
            {showOptions &&
              (!currentData?.options || currentData.options.length === 0) && (
                <div className="text-center">
                  <p className="text-neutral-500 text-sm mb-2">The End.</p>
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
    </div>
  );
}
