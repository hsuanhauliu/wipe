import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Helper Components ---

const Icon = ({ path, className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const Arrow = () => (
    <div className="my-8 flex justify-center" style={{ position: 'relative', top: '3px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
    </div>
);

const Notification = ({ message, visible }) => (
    <div className={`fixed top-5 right-5 bg-red-500 text-white py-3 px-5 rounded-lg shadow-lg transition-opacity transform duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <p>{message}</p>
    </div>
);

const BrushCursor = ({ size, color, position }) => {
    const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    return (
        <div
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: `rgba(${r},${g},${b},0.5)`,
            }}
            className="fixed rounded-full border border-gray-700 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-50"
        />
    );
};


// --- Main Components ---

const Header = ({ onUpload, onToggleInpaint, inpaintActive, hasImages }) => {
    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    return (
        <header className="bg-white p-3 rounded-xl shadow-lg w-full flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Wipe</h1>
                <button
                    onClick={onToggleInpaint}
                    title="Inpaint Brush"
                    className={`p-3 rounded-full hover:bg-gray-200 transition ${inpaintActive ? 'bg-indigo-100 text-indigo-700' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}
                    disabled={!hasImages}
                >
                    <Icon path="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                </button>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={handleUploadClick} title="Upload Images" className="cursor-pointer p-3 rounded-full hover:bg-gray-200 transition">
                    <Icon path="M12 4v16m8-8H4" className="h-6 w-6 text-gray-700" />
                </button>
                <input type="file" ref={fileInputRef} multiple className="hidden" accept="image/*" onChange={onUpload} />
            </div>
        </header>
    );
};

const InpaintMenu = ({ brushSize, setBrushSize, brushColor, setBrushColor, onUndo, onClear, onProcess, canUndo }) => (
    <div className="w-full bg-white p-3 rounded-xl shadow-md flex items-center justify-center gap-x-3 gap-y-4 flex-wrap">
        <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
                <label htmlFor="brush-size" className="text-sm text-gray-600">Size:</label>
                <input type="range" id="brush-size" min="2" max="100" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} className="w-28 accent-indigo-600" />
            </div>
            <div className="flex items-center space-x-2">
                <label htmlFor="brush-color" className="text-sm text-gray-600">Color:</label>
                <input type="color" id="brush-color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-8 h-8 p-0.5 bg-white border border-gray-300 rounded-md cursor-pointer" />
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={onUndo} title="Undo Drawing" className="p-3 rounded-full hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed" disabled={!canUndo}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 016 6v3" />
                </svg>
            </button>
            <button onClick={onClear} title="Clear Drawing" className="p-3 rounded-full hover:bg-gray-200 transition">
                <Icon path="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </button>
            <button onClick={onProcess} title="Process Image" className="p-3 rounded-full hover:bg-green-100 text-green-600 transition">
                <Icon path="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </button>
        </div>
    </div>
);

const Editor = ({ imageFile, imageCount, currentIndex, onPrev, onNext, onCanvasReady, onDraw, inpaintActive, onBrushMove, onBrushVisibilityChange }) => {
    const imageCanvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const editorContainerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (imageFile && imageCanvasRef.current && drawingCanvasRef.current && editorContainerRef.current) {
            const image = new Image();
            const reader = new FileReader();
            reader.onload = (e) => {
                image.src = e.target.result;
                image.onload = () => {
                    const containerWidth = editorContainerRef.current.clientWidth;
                    const scale = containerWidth / image.width;
                    const canvasHeight = image.height * scale;

                    editorContainerRef.current.style.height = `${canvasHeight}px`;

                    [imageCanvasRef.current, drawingCanvasRef.current].forEach(canvas => {
                        canvas.width = image.width;
                        canvas.height = image.height;
                    });

                    const imageCtx = imageCanvasRef.current.getContext('2d');
                    imageCtx.drawImage(image, 0, 0);
                    onCanvasReady({
                        image,
                        drawingCanvas: drawingCanvasRef.current,
                    });
                };
            };
            reader.readAsDataURL(imageFile);
        }
    }, [imageFile, onCanvasReady]);

    const getCoords = (e) => {
        const canvas = drawingCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleX,
        };
    };

    const startDrawing = (e) => {
        if (!inpaintActive) return;
        setIsDrawing(true);
        const coords = getCoords(e);
        onDraw('start', coords);
    };

    const stopDrawing = () => {
        if (!inpaintActive) return;
        setIsDrawing(false);
        onDraw('stop');
    };

    const draw = (e) => {
        if (!isDrawing || !inpaintActive) return;
        const coords = getCoords(e);
        onDraw('draw', coords);
    };
    
    const handleMouseMove = (e) => {
        onBrushMove({ x: e.clientX, y: e.clientY });
        if(isDrawing) draw(e);
    };

    const handleMouseEnter = () => {
        if (inpaintActive) {
            onBrushVisibilityChange(true);
        }
    };

    const handleMouseLeave = () => {
        onBrushVisibilityChange(false);
        stopDrawing();
    };

    return (
        <div className="w-full bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <button onClick={onPrev} className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled={currentIndex === 0}>
                    <Icon path="M15 19l-7-7 7-7" />
                </button>
                <div className="text-center">
                    <p className="text-lg font-medium">Image {currentIndex + 1} of {imageCount}</p>
                    <p className="text-sm text-gray-500">{imageFile?.name}</p>
                </div>
                <button onClick={onNext} className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled={currentIndex === imageCount - 1}>
                    <Icon path="M9 5l7 7-7 7" />
                </button>
            </div>
            <div ref={editorContainerRef} className="relative w-full max-w-3xl mx-auto rounded-lg overflow-hidden shadow-lg bg-gray-200">
                <canvas ref={imageCanvasRef} className="absolute top-0 left-0 w-full h-full" />
                <canvas
                    ref={drawingCanvasRef}
                    className="absolute top-0 left-0 w-full h-full z-10 opacity-60"
                    style={{ cursor: inpaintActive ? 'none' : 'default', pointerEvents: inpaintActive ? 'auto' : 'none' }}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                />
            </div>
        </div>
    );
};

const Thumbnail = ({ file, isActive, onClick }) => {
    const [isVisible, setIsVisible] = useState(false);
    const placeholderRef = useRef(null);
    const objectUrlRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: '100px' } 
        );

        if (placeholderRef.current) {
            observer.observe(placeholderRef.current);
        }

        return () => {
            if (placeholderRef.current) {
                observer.unobserve(placeholderRef.current);
            }
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, []);

    if (isVisible) {
        if (!objectUrlRef.current) {
            objectUrlRef.current = URL.createObjectURL(file);
        }
        return (
            <img
                src={objectUrlRef.current}
                alt={`thumbnail`}
                className={`w-20 h-16 flex-shrink-0 rounded cursor-pointer border-4 object-cover transition ${isActive ? 'border-indigo-600' : 'border-transparent'}`}
                onClick={onClick}
            />
        );
    }

    return (
        <div
            ref={placeholderRef}
            className={`w-20 h-16 flex-shrink-0 rounded bg-gray-300 ${isActive ? 'border-4 border-indigo-600' : ''}`}
            onClick={onClick}
        />
    );
};


const Carousel = ({ images, currentIndex, onSelect }) => {
    const listRef = useRef(null);

    const scroll = (amount) => {
        if (listRef.current) {
            listRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };
    
    useEffect(() => {
        const activeThumb = listRef.current?.querySelector('.is-active');
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [currentIndex]);

    if (images.length <= 1) return null;

    return (
        <div className="w-full mt-4">
            <div className="flex items-center space-x-2">
                <button onClick={() => scroll(-200)} className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 transition">
                    <Icon path="M15 19l-7-7 7-7" className="h-5 w-5" />
                </button>
                <div className="flex-grow overflow-hidden">
                    <div ref={listRef} className="flex items-center space-x-2 p-2 bg-gray-200 rounded-lg overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {images.map((file, index) => (
                            <Thumbnail
                                key={file.name + index}
                                file={file}
                                isActive={currentIndex === index}
                                onClick={() => onSelect(index)}
                            />
                        ))}
                    </div>
                </div>
                <button onClick={() => scroll(200)} className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 transition">
                    <Icon path="M9 5l7 7-7 7" className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

const TextControls = ({ activeText, onUpdate, fonts }) => {
    if (!activeText) return null;

    return (
        <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-lg">
            <div className="flex items-center gap-2">
                <label htmlFor="font-size" className="text-sm text-gray-600">Size:</label>
                <input
                    type="range"
                    id="font-size"
                    min="12"
                    max="120"
                    value={activeText.fontSize}
                    onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value, 10) })}
                    className="w-24 accent-indigo-600"
                />
                <span className="text-sm w-8 text-center">{activeText.fontSize}</span>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="font-family" className="text-sm text-gray-600">Font:</label>
                <select
                    id="font-family"
                    value={activeText.fontFamily}
                    onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                    className="p-1 rounded-md border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                    {fonts.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
            </div>
        </div>
    );
};


const ResultSection = ({ processedImage, onAddText, onDownload, textElements, onTextUpdate, onTextDelete, onSetActiveText, activeTextId, activeText, fonts }) => {
    const resultCanvasRef = useRef(null);
    const resultContainerRef = useRef(null);
    const textOverlayRef = useRef(null);

    useEffect(() => {
        if (processedImage && resultCanvasRef.current) {
            const canvas = resultCanvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = processedImage.width;
            canvas.height = processedImage.height;
            ctx.drawImage(processedImage, 0, 0);

            const containerWidth = resultContainerRef.current.clientWidth;
            const scale = containerWidth / processedImage.width;
            resultContainerRef.current.style.height = `${processedImage.height * scale}px`;
        }
    }, [processedImage]);

    const handleDownload = () => {
        onDownload(resultCanvasRef.current);
    };

    return (
        <div className="w-full bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center space-y-4">
            <div className="w-full flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold">Processed Image</h2>
                <div className="flex items-center gap-4 flex-wrap">
                     {activeText && (
                        <TextControls
                            activeText={activeText}
                            onUpdate={(updates) => onTextUpdate(activeTextId, updates)}
                            fonts={fonts}
                        />
                    )}
                    <button onClick={onAddText} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">Add Text</button>
                    <button onClick={handleDownload} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105">
                        Download Result
                    </button>
                </div>
            </div>
            <div 
                ref={resultContainerRef} 
                className="relative w-full max-w-3xl mx-auto rounded-lg overflow-hidden shadow-lg"
                style={{ 
                    backgroundImage: `
                        linear-gradient(45deg, #ccc 25%, transparent 25%), 
                        linear-gradient(-45deg, #ccc 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #ccc 75%), 
                        linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
            >
                <canvas ref={resultCanvasRef} className="absolute top-0 left-0 w-full h-full" />
                <div ref={textOverlayRef} className="absolute top-0 left-0 w-full h-full z-20">
                    {textElements.map(text => (
                        <EditableText
                            key={text.id}
                            {...text}
                            onUpdate={onTextUpdate}
                            onDelete={onTextDelete}
                            isActive={text.id === activeTextId}
                            setActive={onSetActiveText}
                            containerRef={textOverlayRef}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const EditableText = ({ id, content, x, y, fontSize, fontFamily, onUpdate, onDelete, isActive, setActive, containerRef }) => {
    const textRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const handleDoubleClick = () => {
        setIsEditing(true);
        setActive(id);
        setTimeout(() => {
            if (textRef.current) {
                textRef.current.focus();
                const range = document.createRange();
                range.selectNodeContents(textRef.current);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 0);
    };

    const handleBlur = (e) => {
        setIsEditing(false);
        onUpdate(id, { content: e.target.innerText });
    };

    const handleMouseDown = useCallback((e) => {
        if (isEditing) return;
        setActive(id);
        const el = textRef.current;
        const container = containerRef.current;
        if (!el || !container) return;

        const offsetX = e.clientX - el.getBoundingClientRect().left;
        const offsetY = e.clientY - el.getBoundingClientRect().top;

        const onMouseMove = (moveEvent) => {
            const parentRect = container.getBoundingClientRect();
            let newX = moveEvent.clientX - parentRect.left - offsetX;
            let newY = moveEvent.clientY - parentRect.top - offsetY;

            newX = Math.max(0, Math.min(newX, parentRect.width - el.offsetWidth));
            newY = Math.max(0, Math.min(newY, parentRect.height - el.offsetHeight));

            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
        };

        const onMouseUp = (upEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            const finalRect = el.getBoundingClientRect();
            const parentRect = container.getBoundingClientRect();
            onUpdate(id, { x: finalRect.left - parentRect.left, y: finalRect.top - parentRect.top });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

    }, [id, onUpdate, setActive, isEditing, containerRef]);
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && isActive && !isEditing) {
                e.preventDefault();
                onDelete(id);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [id, isActive, isEditing, onDelete]);

    return (
        <div
            ref={textRef}
            className={`absolute cursor-move p-1 min-w-[20px] whitespace-pre-wrap font-bold text-gray-800 z-20 ${!isEditing ? 'select-none' : ''} ${isActive && (isHovering || isEditing) ? 'outline outline-2 outline-offset-2 outline-indigo-500' : ''} focus:outline-none`}
            style={{ left: `${x}px`, top: `${y}px`, fontSize: `${fontSize}px`, fontFamily: fontFamily }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onBlur={handleBlur}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            contentEditable={isEditing}
            suppressContentEditableWarning={true}
        >
            {content}
        </div>
    );
};


// --- App Component ---

export default function MainPage() {
    const [imageFiles, setImageFiles] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inpaintActive, setInpaintActive] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const [brushColor, setBrushColor] = useState('#00FF00');
    const [brushPosition, setBrushPosition] = useState({ x: -100, y: -100 });
    const [isBrushVisible, setIsBrushVisible] = useState(false);
    
    const [processedImage, setProcessedImage] = useState(null);
    const [textElements, setTextElements] = useState([]);
    const [activeTextId, setActiveTextId] = useState(null);
    const [fonts] = useState(['Inter', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New']);


    const [notification, setNotification] = useState({ visible: false, message: '' });

    const currentImageRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const drawingCtxRef = useRef(null);
    const drawingHistoryRef = useRef({});

    const showNotification = (message) => {
        setNotification({ visible: true, message });
        setTimeout(() => setNotification({ visible: false, message: '' }), 3000);
    };

    const handleUpload = (e) => {
        const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        if (newFiles.length > 0) {
            const firstNewIndex = imageFiles.length;
            setImageFiles(prev => [...prev, ...newFiles]);
            setCurrentIndex(firstNewIndex);
            setProcessedImage(null);
        }
    };
    
    const handleCanvasReady = useCallback(({ image, drawingCanvas }) => {
        currentImageRef.current = image;
        drawingCanvasRef.current = drawingCanvas;
        drawingCtxRef.current = drawingCanvas.getContext('2d');
        drawingCtxRef.current.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        
        if (!drawingHistoryRef.current[currentIndex]) {
            drawingHistoryRef.current[currentIndex] = [];
        }
    }, [currentIndex]);

    const handleDraw = useCallback((action, coords) => {
        const ctx = drawingCtxRef.current;
        if (!ctx) return;

        if (action === 'start') {
            const history = drawingHistoryRef.current[currentIndex] || [];
            const currentState = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            drawingHistoryRef.current[currentIndex] = [...history, currentState];

            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
        } else if (action === 'draw') {
            const scaleX = ctx.canvas.width / drawingCanvasRef.current.getBoundingClientRect().width;
            ctx.lineWidth = brushSize * scaleX;
            ctx.lineCap = 'round';
            ctx.strokeStyle = brushColor;
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
        } else if (action === 'stop') {
            ctx.beginPath();
        }
    }, [brushColor, brushSize, currentIndex]);

    const handleUndo = () => {
        const history = drawingHistoryRef.current[currentIndex];
        if (history && history.length > 0) {
            const lastState = history[history.length - 1];
            drawingHistoryRef.current[currentIndex] = history.slice(0, -1);
            const ctx = drawingCtxRef.current;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.putImageData(lastState, 0, 0);
        }
    };

    const handleClear = () => {
        const ctx = drawingCtxRef.current;
        if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            drawingHistoryRef.current[currentIndex] = [];
        }
    };

    const handleProcess = () => {
        const drawingCanvas = drawingCanvasRef.current;
        const ctx = drawingCanvas.getContext('2d');
        const isBlank = !ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height).data.some(channel => channel !== 0);

        if (isBlank) {
            showNotification('Please add a drawing before processing.');
            return;
        }

        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = currentImageRef.current.width;
        resultCanvas.height = currentImageRef.current.height;
        const resultCtx = resultCanvas.getContext('2d');
        
        resultCtx.drawImage(currentImageRef.current, 0, 0);
        resultCtx.globalCompositeOperation = 'destination-out';
        resultCtx.drawImage(drawingCanvas, 0, 0);
        resultCtx.globalCompositeOperation = 'source-over';
        
        setProcessedImage(resultCanvas);
        setTextElements([]);
        setActiveTextId(null);
    };
    
    const handleAddText = () => {
        const newText = {
            id: `text-${Date.now()}`,
            content: 'Edit me',
            x: 20,
            y: 20,
            fontSize: 48,
            fontFamily: 'Inter',
        };
        setTextElements(prev => [...prev, newText]);
        setActiveTextId(newText.id);
    };

    const handleTextUpdate = (id, updates) => {
        setTextElements(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const handleTextDelete = (id) => {
        setTextElements(prev => prev.filter(t => t.id !== id));
        setActiveTextId(null);
    };
    
    const handleDownload = (resultCanvas) => {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = resultCanvas.width;
        finalCanvas.height = resultCanvas.height;
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCtx.drawImage(resultCanvas, 0, 0);

        const scaleX = finalCanvas.width / resultCanvas.clientWidth;
        const scaleY = finalCanvas.height / resultCanvas.clientHeight;

        textElements.forEach(text => {
            const fontWeight = 'bold';
            const fontSize = text.fontSize;
            const fontFamily = text.fontFamily;

            finalCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
            finalCtx.fillStyle = '#1F2937';
            finalCtx.textAlign = 'left';
            finalCtx.textBaseline = 'top';
            
            const textLines = text.content.split('\n');
            const lineHeight = fontSize * 1.2;
            
            textLines.forEach((line, i) => {
                finalCtx.fillText(line, text.x * scaleX, (text.y * scaleY) + (i * lineHeight * scaleY));
            });
        });

        const link = document.createElement('a');
        link.download = `wiped_${imageFiles[currentIndex].name}`;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();
    };
    
    const selectImage = (index) => {
        if (index !== currentIndex) {
            setCurrentIndex(index);
            setProcessedImage(null);
        }
    };

    const activeText = textElements.find(t => t.id === activeTextId);

    return (
        <div className="bg-gray-100 text-gray-800 flex flex-col items-center min-h-screen p-4 font-sans">
            <style>{`body { font-family: 'Inter', sans-serif; }`}</style>
            <Notification message={notification.message} visible={notification.visible} />
            {inpaintActive && isBrushVisible && <BrushCursor size={brushSize} color={brushColor} position={brushPosition} />}
            
            <div className="w-full max-w-6xl mx-auto flex flex-col items-center space-y-4">
                <Header 
                    onUpload={handleUpload} 
                    onToggleInpaint={() => setInpaintActive(p => !p)}
                    inpaintActive={inpaintActive}
                    hasImages={imageFiles.length > 0}
                />

                {inpaintActive && imageFiles.length > 0 && (
                    <InpaintMenu
                        brushSize={brushSize}
                        setBrushSize={setBrushSize}
                        brushColor={brushColor}
                        setBrushColor={setBrushColor}
                        onUndo={handleUndo}
                        onClear={handleClear}
                        onProcess={handleProcess}
                        canUndo={drawingHistoryRef.current[currentIndex]?.length > 0}
                    />
                )}

                {imageFiles.length === 0 ? (
                    <div className="text-center text-gray-600 mt-10">
                        <p>Click the '+' button in the top bar to upload an image and get started.</p>
                        <p className="text-gray-500 mt-2">No images uploaded.</p>
                    </div>
                ) : (
                    <>
                        <Editor
                            imageFile={imageFiles[currentIndex]}
                            imageCount={imageFiles.length}
                            currentIndex={currentIndex}
                            onPrev={() => selectImage(currentIndex - 1)}
                            onNext={() => selectImage(currentIndex + 1)}
                            onCanvasReady={handleCanvasReady}
                            onDraw={handleDraw}
                            inpaintActive={inpaintActive}
                            onBrushMove={setBrushPosition}
                            onBrushVisibilityChange={setIsBrushVisible}
                        />
                        <Carousel
                            images={imageFiles}
                            currentIndex={currentIndex}
                            onSelect={selectImage}
                        />
                    </>
                )}
                
                {processedImage && <Arrow />}

                {processedImage && (
                    <ResultSection
                        processedImage={processedImage}
                        onAddText={handleAddText}
                        onDownload={handleDownload}
                        textElements={textElements}
                        onTextUpdate={handleTextUpdate}
                        onTextDelete={handleTextDelete}
                        onSetActiveText={setActiveTextId}
                        activeTextId={activeTextId}
                        activeText={activeText}
                        fonts={fonts}
                    />
                )}
            </div>
        </div>
    );
}
