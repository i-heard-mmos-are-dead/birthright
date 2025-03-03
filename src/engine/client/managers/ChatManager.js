export class ChatManager {
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.networkManager = null;
        this.sceneTree = null;

        this.messages = [];
        this.currentInput = "";
        this.isTyping = false;
        
        this.currentPage = 0;
        this.maxCharsPerLine = 35;
        this.maxLinesPerPage = 7;
        this.maxInputLength = 100;
        this.autoScrollEnabled = true;

        this.cursorPosition = 0;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.modifiers = {
            ctrl: false,
            shift: false
        };
    }

    calculateMessageLines(message) {
        return Math.ceil(message.length / this.maxCharsPerLine);
    }

    calculateTotalLines(upToIndex) {
        return this.messages.slice(0, upToIndex).reduce((total, message) => {
            return total + this.calculateMessageLines(message);
        }, 0);
    }

    getChatContent() {
        if (this.autoScrollEnabled) {
            this.currentPage = Math.max(0, this.getTotalPages() - 1);
        }
    
        let currentLines = 0;
        let startIdx = 0;
        
        const debugInfo = {};
        
        for (let i = 0; i < this.messages.length; i++) {
            const messageLines = this.calculateMessageLines(this.messages[i]);
            if (currentLines + messageLines > this.maxLinesPerPage * this.currentPage) {
                startIdx = i;
                debugInfo.firstLoop = `Break at ${currentLines}/${this.maxLinesPerPage * this.currentPage}`;
                break;
            }
            currentLines += messageLines;
        }
    
        let pageMessages = [];
        currentLines = 0;
        
        for (let i = startIdx; i < this.messages.length; i++) {
            const messageLines = this.calculateMessageLines(this.messages[i]);
            if (currentLines + messageLines > this.maxLinesPerPage) {
                debugInfo.secondLoop = `Break at ${currentLines}/${this.maxLinesPerPage}`;
                break;
            }
            pageMessages.push(this.messages[i]);
            currentLines += messageLines;
        }
    
        if (!ChatManager._lastState) ChatManager._lastState = {};
        const state = {page: this.currentPage, msgCount: pageMessages.length};
        
        if (JSON.stringify(ChatManager._lastState) !== JSON.stringify(state)) {
            ChatManager._lastState = state;
        }
    
        return pageMessages;
    }

    getTotalPages() {
        const totalLines = this.calculateTotalLines(this.messages.length);
        return Math.ceil(totalLines / this.maxLinesPerPage);
    }

    nextPage() {
        const maxPage = Math.max(0, this.getTotalPages() - 1);
        this.currentPage = Math.min(this.currentPage + 1, maxPage);
        if (this.currentPage === maxPage) this.autoScrollEnabled = true;
    }

    previousPage() {
        this.currentPage = Math.max(0, this.currentPage - 1);
        this.autoScrollEnabled = false;
    }

    getPreview() {
        return this.isTyping ? this.currentInput : "";
    }

    getSelection() {
        if (this.selectionStart === null) return null;
        const start = Math.min(this.selectionStart, this.selectionEnd);
        const end = Math.max(this.selectionStart, this.selectionEnd);
        return { start, end };
    }

    moveWordBoundary(forward = true) {
        const text = this.currentInput;
        let pos = this.cursorPosition;
        const regex = /\w+/g;
        let match;

        if (forward) {
            while ((match = regex.exec(text.slice(pos))) !== null) {
                pos += match.index + match[0].length;
                break;
            }
            if (!match) pos = text.length;
        } else {
            const reversedText = text.slice(0, pos).split('').reverse().join('');
            while ((match = regex.exec(reversedText)) !== null) {
                pos -= (match.index + match[0].length);
                break;
            }
            if (!match) pos = 0;
        }

        return pos;
    }

    handleKeyEvent(event) {
        if (event.type === 'keydown') {
            if (event.key === 'Control') this.modifiers.ctrl = true;
            if (event.key === 'Shift') this.modifiers.shift = true;
        } else if (event.type === 'keyup') {
            if (event.key === 'Control') this.modifiers.ctrl = false;
            if (event.key === 'Shift') this.modifiers.shift = false;
            return true;
        }
     
        switch(event.key) {
            case 'Escape':
                this.currentInput = "";
                this.cursorPosition = 0;
                this.selectionStart = null;
                this.selectionEnd = null;
                this.isTyping = false;
                return false;
     
            case 'Enter':
                if (this.currentInput.trim()) {
                    this.messages.push(`You: ${this.currentInput}`);
                    if (this.networkManager) {
                        try {
                            this.networkManager.sendChatMessage(this.currentInput);
                            this.sceneTree.createChatBubble(this.currentInput, true);
                        } catch(e) {
                            console.error('[ChatManager] Network send failed:', e);
                        }
                    } else {
                        console.warn('[ChatManager] No networkManager available for send');
                    }
                    this.currentInput = "";
                    this.cursorPosition = 0;
                    this.selectionStart = null;
                    this.selectionEnd = null;
                    this.autoScrollEnabled = true;
                    return true;
                }
                this.isTyping = false;
                return false;
     
            case 'ArrowLeft':
                if (this.modifiers.ctrl) {
                    const newPos = this.moveWordBoundary(false);
                    if (this.modifiers.shift) {
                        if (this.selectionStart === null) this.selectionStart = this.cursorPosition;
                        this.selectionEnd = newPos;
                    } else {
                        this.selectionStart = null;
                        this.selectionEnd = null;
                    }
                    this.cursorPosition = newPos;
                } else {
                    if (this.modifiers.shift) {
                        if (this.selectionStart === null) this.selectionStart = this.cursorPosition;
                        this.selectionEnd = Math.max(0, this.cursorPosition - 1);
                    } else {
                        this.selectionStart = null;
                        this.selectionEnd = null;
                    }
                    this.cursorPosition = Math.max(0, this.cursorPosition - 1);
                }
                break;
     
            case 'ArrowRight':
                if (this.modifiers.ctrl) {
                    const newPos = this.moveWordBoundary(true);
                    if (this.modifiers.shift) {
                        if (this.selectionStart === null) this.selectionStart = this.cursorPosition;
                        this.selectionEnd = newPos;
                    } else {
                        this.selectionStart = null;
                        this.selectionEnd = null;
                    }
                    this.cursorPosition = newPos;
                } else {
                    if (this.modifiers.shift) {
                        if (this.selectionStart === null) this.selectionStart = this.cursorPosition;
                        this.selectionEnd = Math.min(this.currentInput.length, this.cursorPosition + 1);
                    } else {
                        this.selectionStart = null;
                        this.selectionEnd = null;
                    }
                    this.cursorPosition = Math.min(this.currentInput.length, this.cursorPosition + 1);
                }
                break;
     
            case 'Home':
                if (this.modifiers.shift) {
                    if (this.selectionStart === null) this.selectionStart = this.cursorPosition;
                    this.selectionEnd = 0;
                } else {
                    this.selectionStart = null;
                    this.selectionEnd = null;
                }
                this.cursorPosition = 0;
                break;
     
            case 'End':
                if (this.modifiers.shift) {
                    if (this.selectionStart === null) this.selectionStart = this.cursorPosition;
                    this.selectionEnd = this.currentInput.length;
                } else {
                    this.selectionStart = null;
                    this.selectionEnd = null;
                }
                this.cursorPosition = this.currentInput.length;
                break;
     
            case 'Backspace':
                if (this.getSelection()) {
                    const sel = this.getSelection();
                    this.currentInput = this.currentInput.slice(0, sel.start) + 
                                      this.currentInput.slice(sel.end);
                    this.cursorPosition = sel.start;
                    this.selectionStart = null;
                    this.selectionEnd = null;
                } else if (this.cursorPosition > 0) {
                    this.currentInput = this.currentInput.slice(0, this.cursorPosition - 1) + 
                                      this.currentInput.slice(this.cursorPosition);
                    this.cursorPosition--;
                }
                break;
     
            case 'Delete':
                if (this.getSelection()) {
                    const sel = this.getSelection();
                    this.currentInput = this.currentInput.slice(0, sel.start) + 
                                      this.currentInput.slice(sel.end);
                    this.cursorPosition = sel.start;
                    this.selectionStart = null;
                    this.selectionEnd = null;
                } else if (this.cursorPosition < this.currentInput.length) {
                    this.currentInput = this.currentInput.slice(0, this.cursorPosition) + 
                                      this.currentInput.slice(this.cursorPosition + 1);
                }
                break;
     
            default:
                if (event.key.length === 1) {
                    if (this.modifiers.ctrl) {
                        if (event.key.toLowerCase() === 'c' && this.getSelection()) {
                            const sel = this.getSelection();
                            navigator.clipboard.writeText(this.currentInput.slice(sel.start, sel.end));
                        } else if (event.key.toLowerCase() === 'v') {
                            navigator.clipboard.readText().then(pastedText => {
                                const remainingSpace = this.maxInputLength - this.currentInput.length;
                                if (this.getSelection()) {
                                    const sel = this.getSelection();
                                    const selectionLength = sel.end - sel.start;
                                    const effectiveSpace = remainingSpace + selectionLength;
                                    const truncatedText = pastedText.slice(0, effectiveSpace);
                                    
                                    this.currentInput = this.currentInput.slice(0, sel.start) + 
                                                        truncatedText +
                                                        this.currentInput.slice(sel.end);
                                    this.cursorPosition = sel.start + truncatedText.length;
                                } else {
                                    const truncatedText = pastedText.slice(0, remainingSpace);
                                    this.currentInput = this.currentInput.slice(0, this.cursorPosition) + 
                                                        truncatedText +
                                                        this.currentInput.slice(this.cursorPosition);
                                    this.cursorPosition += truncatedText.length;
                                }
                                this.selectionStart = null;
                                this.selectionEnd = null;
                            });
                        } else if (event.key.toLowerCase() === 'x' && this.getSelection()) {
                            const sel = this.getSelection();
                            navigator.clipboard.writeText(this.currentInput.slice(sel.start, sel.end));
                            this.currentInput = this.currentInput.slice(0, sel.start) + 
                                              this.currentInput.slice(sel.end);
                            this.cursorPosition = sel.start;
                            this.selectionStart = null;
                            this.selectionEnd = null;
                        }
                        
                    } else {
                        if (this.currentInput.length >= this.maxInputLength && !this.getSelection()) {
                            return true;
                        }
                        
                        if (this.getSelection()) {
                            const sel = this.getSelection();
                            const selectionLength = sel.end - sel.start;
                            if (this.currentInput.length - selectionLength >= this.maxInputLength) {
                                return true;
                            }
                            
                            this.currentInput = this.currentInput.slice(0, sel.start) + 
                                                event.key +
                                                this.currentInput.slice(sel.end);
                            this.cursorPosition = sel.start + 1;
                            this.selectionStart = null;
                            this.selectionEnd = null;
                        } else {
                            this.currentInput = this.currentInput.slice(0, this.cursorPosition) + 
                                                event.key +
                                                this.currentInput.slice(this.cursorPosition);
                            this.cursorPosition++;
                        }
                    }
                }
        }
            
        return true;
    }

    receiveMessage(message) {
        let messageString = message;
        if (typeof message === 'object' && message.sender && message.content) {
            messageString = `${message.sender}: ${message.content}`;
            this.sceneTree.createChatBubble(message.content, false, message.sender);  // false = not current player
        }
        this.messages.push(messageString);
        if (this.autoScrollEnabled) {
            this.currentPage = Math.max(0, this.getTotalPages() - 1);
        }
    }


}