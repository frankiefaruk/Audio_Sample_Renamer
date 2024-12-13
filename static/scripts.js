document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const status = document.getElementById('status');
    const manualFilenameInput = document.getElementById('manualFilenameInput');
    const newBaseName = document.getElementById('newBaseName');
    const startNoteSelect = document.getElementById('startNote');
    const endNoteSelect = document.getElementById('endNote');
    const generateSequenceBtn = document.getElementById('generateSequence');
    const resetButton = document.getElementById('resetButton');

    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let manualFiles = [];

    function getMIDINoteInfo(midiNumber) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNumber / 12) - 1;
        const noteIndex = midiNumber % 12;
        return {
            noteName: `${noteNames[noteIndex]}${octave}`,
            midiNumber: midiNumber
        };
    }

    function extractNoteInfo(filename) {
        let match = filename.match(/^(\d+)_([A-G]#?\-?\d+)/);
        if (match) {
            return {
                midiNumber: parseInt(match[1]),
                noteName: match[2]
            };
        }

        match = filename.match(/([A-G]#?\d+)-V\d+/);
        if (match) {
            const notePart = match[1];
            const note = notePart.replace(/\d+$/, '');
            const octave = parseInt(notePart.match(/\d+$/)[0]);
            const noteIndex = NOTE_NAMES.indexOf(note);
            if (noteIndex !== -1) {
                const midiNumber = ((octave + 1) * 12) + noteIndex;
                return {
                    midiNumber: midiNumber,
                    noteName: `${note}${octave}`
                };
            }
        }

        match = filename.match(/(?:MIDI|Note|_)(\d{1,3})(?:[_\s-]|$)/);
        if (match) {
            const midiNumber = parseInt(match[1]);
            if (midiNumber >= 0 && midiNumber <= 127) {
                return getMIDINoteInfo(midiNumber);
            }
        }

        return null;
    }

    function noteNameToMIDINumber(noteName) {
        // Extract note and octave, handling negative octaves correctly
        const match = noteName.match(/([A-G]#?)(-?\d+)/);
        if (!match) return null;
        
        const note = match[1];
        const octave = parseInt(match[2]);
        
        const noteToIndex = {
            'C': 0, 'C#': 1,
            'D': 2, 'D#': 3,
            'E': 4,
            'F': 5, 'F#': 6,
            'G': 7, 'G#': 8,
            'A': 9, 'A#': 10,
            'B': 11
        };

        const noteIndex = noteToIndex[note];
        if (noteIndex !== undefined) {
            // Adjust formula to handle negative octaves
            return ((octave + 1) * 12) + noteIndex;
        }
        return null;
    }

    function populateNoteSelects() {
        const notes = [];
        for (let octave = -1; octave <= 9; octave++) {
            NOTE_NAMES.forEach(note => {
                if (octave === 9 && NOTE_NAMES.indexOf(note) > NOTE_NAMES.indexOf('G')) {
                    return;
                }
                notes.push(`${note}${octave}`);
            });
        }
        
        notes.forEach(note => {
            const startOption = new Option(note, note);
            const endOption = new Option(note, note);
            startNoteSelect.add(startOption);
            endNoteSelect.add(endOption);
        });

        startNoteSelect.value = 'C-1';
        endNoteSelect.value = 'G9';
    }

    function adjustNoteRange(files) {
        let minMidi = Infinity;
        let maxMidi = -Infinity;
        let hasValidNotes = false;
        
        files.forEach(file => {
            const fileName = file.name;
            const noteMatch = fileName.match(/([A-G]#?\d+)-V\d+/);
            if (noteMatch) {
                const noteName = noteMatch[1];
                const midiNumber = noteNameToMIDINumber(noteName);
                
                const key = noteName;
                if (!isNaN(midiNumber)) {
                    hasValidNotes = true;
                    minMidi = Math.min(minMidi, midiNumber);
                    maxMidi = Math.max(maxMidi, midiNumber);
                }
            }
        });

        if (hasValidNotes && minMidi !== Infinity && maxMidi !== -Infinity) {
            const minNoteName = getMIDINoteInfo(minMidi).noteName;
            const maxNoteName = getMIDINoteInfo(maxMidi).noteName;
            
            if (startNoteSelect.querySelector(`option[value="${minNoteName}"]`)) {
                startNoteSelect.value = minNoteName;
            }
            if (endNoteSelect.querySelector(`option[value="${maxNoteName}"]`)) {
                endNoteSelect.value = maxNoteName;
            }
        }
    }

    function updateFileList(files) {
        fileList.innerHTML = '<h2>Files to Process</h2>';
        
        const previewField = document.createElement('div');
        previewField.className = 'preview-field';
        const previewArea = document.createElement('textarea');
        previewArea.className = 'preview-textarea';
        previewArea.id = 'previewArea';
        previewField.appendChild(previewArea);
        fileList.appendChild(previewField);
        
        let previewContent = '';
        
        const customName = newBaseName.value.trim() || 'Unnamed';
        
        if (manualFiles.length > 0) {
            manualFiles.forEach(filename => {
                const parts = filename.split('_');
                const midiNum = parts[0];
                const noteName = parts[1];
                previewContent += `${midiNum}_${noteName}_${customName}.wav\n`;
            });
        } else if (files && files.length > 0) {
            const noteGroups = new Map();
            
            [...files].forEach(file => {
                const fileName = file.name;
                const noteMatch = fileName.match(/([A-G]#?\d+)-V\d+/);
                if (noteMatch) {
                    const noteName = noteMatch[1];
                    const midiNumber = noteNameToMIDINumber(noteName);
                    
                    const key = noteName;
                    if (!noteGroups.has(key)) {
                        noteGroups.set(key, []);
                    }
                    noteGroups.get(key).push({
                        originalName: fileName,
                        noteName: noteName,
                        midiNumber: midiNumber
                    });
                }
            });

            noteGroups.forEach((filesInGroup, noteKey) => {
                filesInGroup.forEach((fileInfo, index) => {
                    if (fileInfo.midiNumber) {
                        previewContent += `${String(fileInfo.midiNumber).padStart(2, '0')}_${fileInfo.noteName}_${customName}_${index + 1}\n`;
                    }
                });
            });
        }
        
        document.getElementById('previewArea').value = previewContent.trim();
    }

    function generateNoteSequence() {
        const customName = manualFilenameInput.value.trim() || 'Unnamed';
        
        const startMIDI = noteNameToMIDINumber(startNoteSelect.value);
        const endMIDI = noteNameToMIDINumber(endNoteSelect.value);
        
        if (startMIDI === null || endMIDI === null) {
            status.className = 'status error';
            status.textContent = 'Invalid note range: Unable to convert note names to MIDI numbers';
            return;
        }

        if (startMIDI < 0 || endMIDI > 127) {
            status.className = 'status error';
            status.textContent = 'Note range must be within MIDI range (0-127)';
            return;
        }

        if (startMIDI > endMIDI) {
            status.className = 'status error';
            status.textContent = 'Start note must be lower than or equal to end note';
            return;
        }

        manualFiles = [];
        for (let midi = startMIDI; midi <= endMIDI; midi++) {
            const noteName = getMIDINoteInfo(midi).noteName;
            const newFileName = `${String(midi).padStart(2, '0')}_${noteName}_${customName}.wav`;
            manualFiles.push(newFileName);
        }

        updateFileList(fileInput.files);
        
        status.className = 'status success';
        status.textContent = `Generated ${manualFiles.length} file names`;
        setTimeout(() => {
            status.className = 'status';
            status.textContent = '';
        }, 2000);
    }

    function resetAll() {
        manualFilenameInput.value = '';
        newBaseName.value = '';
        startNoteSelect.value = 'C-1';
        endNoteSelect.value = 'G9';
        fileList.innerHTML = '<h2>Files to Process</h2>';
        const previewField = document.createElement('div');
        previewField.className = 'preview-field';
        const previewArea = document.createElement('textarea');
        previewArea.className = 'preview-textarea';
        previewField.appendChild(previewArea);
        fileList.appendChild(previewField);
        manualFiles = [];
        fileInput.value = '';
        status.className = 'status';
        status.textContent = '';
    }

    generateSequenceBtn.addEventListener('click', generateNoteSequence);
    resetButton.addEventListener('click', resetAll);
    
    startNoteSelect.addEventListener('change', () => {});
    endNoteSelect.addEventListener('change', () => {});

    const updateBaseNamesBtn = document.getElementById('updateBaseNames');
    const resetBaseNamesBtn = document.getElementById('resetBaseNames');

    updateBaseNamesBtn.addEventListener('click', () => {
        const newName = newBaseName.value.trim();
        if (newName) {
            updateFileList(fileInput.files);
            status.className = 'status success';
            status.textContent = 'Base names updated successfully';
            setTimeout(() => {
                status.className = 'status';
                status.textContent = '';
            }, 2000);
        } else {
            status.className = 'status error';
            status.textContent = 'Please enter a base name';
            setTimeout(() => {
                status.className = 'status';
                status.textContent = '';
            }, 2000);
        }
    });

    resetBaseNamesBtn.addEventListener('click', () => {
        newBaseName.value = '';
        updateFileList(fileInput.files);
        status.className = 'status success';
        status.textContent = 'Base name reset successfully';
        setTimeout(() => {
            status.className = 'status';
            status.textContent = '';
        }, 2000);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);
    
    populateNoteSelects();

    function handleFiles(e) {
        const files = [...e.target.files];
        
        if (files.length > 0) {
            adjustNoteRange(files);
        }
        
        const customName = manualFilenameInput.value.trim() || 'Unnamed';
        
        updateFileList(files);
        
        if (files.length > 0) {
            status.className = 'status success';
            status.textContent = `${files.length} files ready for processing`;
        }
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files: files } });
    }

    manualFilenameInput.addEventListener('input', () => {
        if (fileInput.files.length > 0 || manualFiles.length > 0) {
            updateFileList(fileInput.files);
        }
    });

    newBaseName.addEventListener('input', () => {
        if (fileInput.files.length > 0 || manualFiles.length > 0) {
            updateFileList(fileInput.files);
        }
    });

    const renameFilesButton = document.getElementById('renameFilesButton');

    renameFilesButton.addEventListener('click', async () => {
        try {
            // Check if we have files to rename
            if (!fileInput.files.length && !manualFiles.length) {
                status.className = 'status error';
                status.textContent = 'No files selected for renaming';
                return;
            }

            // Request permission to access files
            try {
                const handle = await window.showDirectoryPicker({
                    mode: 'readwrite'
                });
                
                const previewContent = document.getElementById('previewArea').value;
                const fileLines = previewContent.split('\n');
                
                let filesRenamed = 0;
                
                // Iterate through original files and rename them
                for (let i = 0; i < fileInput.files.length; i++) {
                    const originalFile = fileInput.files[i];
                    const newName = fileLines[i];
                    
                    if (newName) {
                        try {
                            const newHandle = await handle.getFileHandle(newName, { create: true });
                            const writableStream = await newHandle.createWritable();
                            await writableStream.write(await originalFile.arrayBuffer());
                            await writableStream.close();
                            filesRenamed++;
                        } catch (err) {
                            console.error(`Error renaming file ${originalFile.name}:`, err);
                        }
                    }
                }
                
                status.className = 'status success';
                status.textContent = `Successfully renamed ${filesRenamed} files`;
                
            } catch (err) {
                if (err.name === 'AbortError') {
                    status.className = 'status';
                    status.textContent = 'File renaming cancelled';
                } else {
                    throw err;
                }
            }
            
        } catch (err) {
            console.error('Error during file renaming:', err);
            status.className = 'status error';
            status.textContent = 'Error renaming files: ' + err.message;
        }
        
        // Clear status after 3 seconds
        setTimeout(() => {
            status.className = 'status';
            status.textContent = '';
        }, 3000);
    });
});