import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Wand2, RotateCcw, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { CompareSlider } from './components/CompareSlider';
import { ChatInterface } from './components/ChatInterface';
import { STYLE_PRESETS } from './constants';
import { RoomImage, ChatMessage, ProcessingStatus } from './types';
import { generateReimaginedRoom, editRoomImage, sendChatMessage } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<RoomImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1); // -1 means no generation yet, 0+ index in generatedImages
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Computed
  const currentDisplayedImage = selectedImageIndex >= 0 ? generatedImages[selectedImageIndex] : null;

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setOriginalImage(base64);
        // Reset state
        setGeneratedImages([]);
        setSelectedImageIndex(-1);
        setChatMessages([]);
        setStatus(ProcessingStatus.IDLE);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSampleImage = async () => {
    try {
      // Use a high-quality interior image from Unsplash
      const response = await fetch("https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1000");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setOriginalImage(base64);
        setGeneratedImages([]);
        setSelectedImageIndex(-1);
        setChatMessages([]);
        setStatus(ProcessingStatus.IDLE);
        setErrorMsg(null);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not load sample image. Please upload one instead.");
    }
  };

  const handleStyleSelect = async (styleId: string) => {
    if (!originalImage || status === ProcessingStatus.GENERATING) return;

    const style = STYLE_PRESETS.find(s => s.id === styleId);
    if (!style) return;

    setStatus(ProcessingStatus.GENERATING);
    setErrorMsg(null);

    try {
      const resultBase64 = await generateReimaginedRoom(originalImage, style.prompt);
      
      const newImage: RoomImage = {
        id: Date.now().toString(),
        url: resultBase64,
        styleName: style.name,
        description: `Reimagined in ${style.name} style`
      };

      setGeneratedImages(prev => [...prev, newImage]);
      setSelectedImageIndex(prev => generatedImages.length); // Select the new one (prev length is now last index)
    } catch (err) {
      setErrorMsg("Failed to generate design. Please try again.");
    } finally {
      setStatus(ProcessingStatus.IDLE);
    }
  };

  const handleChatRequest = async (text: string) => {
    if (status === ProcessingStatus.EDITING) return;

    // Check if user is asking for an edit (naive check for specific keywords, or we can just let Gemini handle it via chat logic 
    // BUT the requirement says "edit images using Gemini 2.5 Flash Image" when user says "Add a retro filter".
    // We should distinguish between a Chat Question and an Image Edit Command.
    // For a robust app, we'd use an intent classifier. Here, we'll try a simple heuristic or pass to chat and see if it's an edit instruction.
    // However, keeping it simple: If the user says "edit", "change", "add", "remove" + visual context, we treat it as an edit.
    
    const isEditCommand = /change|add|remove|make|turn/i.test(text);
    
    // Add user message to chat immediately
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, userMsg]);

    // If it looks like an edit command and we have an active image
    if (isEditCommand && currentDisplayedImage) {
      setStatus(ProcessingStatus.EDITING);
      try {
        // We edit the CURRENTLY displayed image (generated or original? Let's edit the current view)
        // Ideally we edit the *generated* one if selected, or original if not.
        const sourceImage = currentDisplayedImage.url;

        // Optimistic update message
        const systemMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: "I'm applying those changes to the design...",
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, systemMsg]);

        const editedBase64 = await editRoomImage(sourceImage, text);
        
        const newImage: RoomImage = {
          id: Date.now().toString(),
          url: editedBase64,
          styleName: 'Custom Edit',
          description: text
        };

        setGeneratedImages(prev => [...prev, newImage]);
        setSelectedImageIndex(prev => generatedImages.length); // Select new
        
        // Confirmation message
        const doneMsg: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'model',
          text: "Here is the updated design based on your request.",
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, doneMsg]);

      } catch (err) {
        const errChat: ChatMessage = {
          id: Date.now().toString(),
          role: 'model',
          text: "Sorry, I encountered an issue editing the image.",
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, errChat]);
      } finally {
        setStatus(ProcessingStatus.IDLE);
      }
      return;
    }

    // Normal Chat Flow
    setStatus(ProcessingStatus.GENERATING); // Reusing generating status for chat thinking
    try {
      // Pass the current image context if available
      const contextImage = currentDisplayedImage?.url || originalImage || undefined;
      const responseMsg = await sendChatMessage(chatMessages, text, contextImage);
      setChatMessages(prev => [...prev, responseMsg]);
    } catch (err) {
        const errChat: ChatMessage = {
            id: Date.now().toString(),
            role: 'model',
            text: "I'm having trouble connecting right now. Please try again.",
            timestamp: Date.now()
          };
          setChatMessages(prev => [...prev, errChat]);
    } finally {
        setStatus(ProcessingStatus.IDLE);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <Sparkles size={20} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Lumina AI</h1>
            </div>
            <div className="text-sm text-slate-500 hidden sm:block">AI Interior Design Consultant</div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8 grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Visualization (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Stage Area */}
            <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
                {!originalImage ? (
                    // Upload State
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center m-4 rounded-xl bg-slate-50 relative">
                        <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mb-4 text-indigo-600">
                            <Camera size={32} />
                        </div>
                        <h2 className="text-xl font-semibold mb-2 text-slate-800">Upload your room photo</h2>
                        <p className="text-slate-500 max-w-md mb-8">Take a photo of your living room, bedroom, or kitchen to get started. We'll help you reimagine the space.</p>
                        
                        <div className="flex flex-col gap-3 items-center w-full max-w-xs z-10">
                            <label className="w-full">
                                <div className="w-full px-6 py-3 bg-indigo-600 text-white rounded-full font-medium shadow-sm hover:bg-indigo-700 cursor-pointer transition-colors flex items-center justify-center gap-2">
                                    <Upload size={18} />
                                    <span>Select Photo</span>
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileUpload} 
                                    className="hidden" 
                                />
                            </label>
                            
                            <div className="relative w-full flex items-center justify-center my-1">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                <span className="relative bg-slate-50 px-2 text-xs text-slate-400 uppercase">Or</span>
                            </div>

                            <button 
                                onClick={handleSampleImage}
                                className="w-full px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-full font-medium shadow-sm hover:bg-white hover:border-slate-400 transition-colors flex items-center justify-center gap-2"
                            >
                                <ImageIcon size={18} />
                                <span>Try Sample Room</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    // Compare / View State
                    <div className="relative flex-1 bg-slate-100">
                        {currentDisplayedImage ? (
                            <CompareSlider 
                                original={originalImage} 
                                generated={currentDisplayedImage.url} 
                            />
                        ) : (
                            <div className="w-full h-[500px] relative">
                                <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-xl shadow-lg text-center">
                                        <Wand2 className="mx-auto mb-2 text-indigo-600" />
                                        <p className="font-medium">Select a style below to generate</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Status Overlay */}
                        {(status === ProcessingStatus.GENERATING || status === ProcessingStatus.EDITING) && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-indigo-900">
                                <Loader2 className="animate-spin mb-3 text-indigo-600" size={48} />
                                <p className="text-lg font-medium animate-pulse">
                                    {status === ProcessingStatus.GENERATING ? "Designing your new room..." : "Applying edits..."}
                                </p>
                            </div>
                        )}
                        
                        {/* Reset Button */}
                        <button 
                            onClick={() => {
                                setOriginalImage(null);
                                setGeneratedImages([]);
                                setChatMessages([]);
                            }}
                            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur text-slate-600 rounded-lg hover:bg-white hover:text-red-600 transition-colors shadow-sm z-10"
                            title="Start Over"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* Carousel */}
            {originalImage && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Design Styles</h3>
                        {errorMsg && <span className="text-red-500 text-sm">{errorMsg}</span>}
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                        {/* Styles Presets */}
                        {STYLE_PRESETS.map((style) => (
                            <button
                                key={style.id}
                                onClick={() => handleStyleSelect(style.id)}
                                disabled={status !== ProcessingStatus.IDLE}
                                className="flex-none w-32 snap-start group"
                            >
                                <div className={`w-32 h-32 rounded-xl mb-2 overflow-hidden shadow-sm border-2 transition-all ${style.thumbnailColor} ${status !== ProcessingStatus.IDLE ? 'opacity-50' : 'hover:border-indigo-500 hover:shadow-md border-transparent'}`}>
                                    {/* Placeholder visual for style */}
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform duration-500">
                                       <ImageIcon size={32} className="opacity-40" />
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-slate-700 block text-center truncate px-1">
                                    {style.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Generated History Thumbs */}
                    {generatedImages.length > 0 && (
                        <>
                             <div className="h-px bg-slate-200 my-2" />
                             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Your Designs</h3>
                             <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
                                {generatedImages.map((img, idx) => (
                                    <button
                                        key={img.id}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={`flex-none w-24 snap-start relative ${idx === selectedImageIndex ? 'ring-2 ring-indigo-600 ring-offset-2 rounded-lg' : ''}`}
                                    >
                                        <img src={img.url} className="w-24 h-24 object-cover rounded-lg shadow-sm" alt={img.styleName} />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 rounded-b-lg truncate text-center">
                                            {img.styleName}
                                        </div>
                                    </button>
                                ))}
                             </div>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* Right Column: Chat (4 cols) */}
        <div className="lg:col-span-4 h-[600px] lg:h-auto lg:min-h-[600px] sticky top-24">
            <ChatInterface 
                messages={chatMessages} 
                onSendMessage={handleChatRequest}
                isProcessing={status !== ProcessingStatus.IDLE} 
            />
        </div>

      </main>
    </div>
  );
};

export default App;