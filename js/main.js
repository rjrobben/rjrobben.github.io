document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('nav-toggle');
    const body = document.body; // Get the body element
    const sidebarStateKey = 'sidebarState';

    // Function to apply sidebar state from localStorage
    const applySidebarState = () => {
        const storedState = localStorage.getItem(sidebarStateKey);
        if (storedState === 'expanded') {
            body.classList.remove('sidebar-collapsed');
        } else { // Default to collapsed if 'collapsed' or no state found
            body.classList.add('sidebar-collapsed');
            if (!storedState) { // If no state was found, set it to collapsed
                localStorage.setItem(sidebarStateKey, 'collapsed');
            }
        }
    };

    applySidebarState(); // Apply state on page load

    if (navToggle) {
        // Set initial aria-expanded state based on the applied sidebar state
        if (body.classList.contains('sidebar-collapsed')) {
            navToggle.setAttribute('aria-expanded', 'false'); // Collapsed: three lines
        } else {
            navToggle.setAttribute('aria-expanded', 'true');  // Expanded: cross
        }

        navToggle.addEventListener('click', () => {
            body.classList.toggle('sidebar-collapsed'); // Toggle class on body

            // Update aria-expanded and save state to localStorage
            if (body.classList.contains('sidebar-collapsed')) {
                navToggle.setAttribute('aria-expanded', 'false');
                localStorage.setItem(sidebarStateKey, 'collapsed');
            } else {
                navToggle.setAttribute('aria-expanded', 'true');
                localStorage.setItem(sidebarStateKey, 'expanded');
            }
        });
    }

    // Theme Toggler
    const themeToggle = document.getElementById('theme-toggle');
    // const body = document.body; // Removed duplicate declaration

    // Manages the Utterances iframe theme updates
    let utterancesObserver = null; // To keep track of the MutationObserver

    function utterancesTheme () {
        const processIframe = (iframeElement) => {
            const currentThemeForMessage = document.documentElement.getAttribute('data-theme') === 'dark' ? 'github-dark' : 'github-light';

            const sendMessageToIframe = () => {
                if (iframeElement.contentWindow) {
                    try {
                        iframeElement.contentWindow.postMessage({ type: 'set-theme', theme: currentThemeForMessage }, 'https://utteranc.es');
                        iframeElement.dataset.utterancesThemeLastSent = currentThemeForMessage; // Record what was sent
                    } catch (e) { console.error("Error posting message to Utterances iframe:", e); }
                }
            };

            const finalizeProcessing = () => {
                // Mark that this iframe's current content is processed.
                iframeElement.dataset.utterancesProcessed = 'true'; 
                
                setTimeout(() => {
                    sendMessageToIframe();
                }, 250); // Delay for sending message
            };

            // If this iframe's content was already processed:
            if (iframeElement.dataset.utterancesProcessed === 'true') {
                // Check if the theme has changed since last send
                if (iframeElement.dataset.utterancesThemeLastSent !== currentThemeForMessage) {
                    sendMessageToIframe(); // Send new theme immediately (no timeout needed as iframe is long loaded)
                }
                return; // Done for this iframe element unless theme changes
            }

            // If a load listener is already attached (and 'processed' is false), we're waiting for it.
            // This prevents re-attaching listeners if processIframe is called multiple times rapidly for the same un-processed iframe.
            if (iframeElement.hasAttribute('data-utterances-load-listener-attached')) {
                return;
            }

            const loadHandler = () => {
                // Listener has fired, so it's no longer "attached" in a pending state for this load.
                iframeElement.removeAttribute('data-utterances-load-listener-attached');
                finalizeProcessing();
            };
            
            iframeElement.addEventListener('load', loadHandler, { once: true });
            iframeElement.setAttribute('data-utterances-load-listener-attached', 'true');

            // Race condition: If 'load' fired before listener was attached.
            try {
                // Check if the iframe's document is in a 'complete' state.
                if (iframeElement.contentDocument && iframeElement.contentDocument.readyState === 'complete') {
                    // 'load' has already fired. Our listener (even if {once:true}) will not fire for this event.
                    // So, manually trigger finalizeProcessing.
                    // And ensure the listener we just added is cleaned up regarding its flag.
                    iframeElement.removeEventListener('load', loadHandler); // Attempt to remove the listener we just added.
                    iframeElement.removeAttribute('data-utterances-load-listener-attached');
                    finalizeProcessing();
                }
            } catch (e) { 
                // Catch potential cross-origin errors when accessing contentDocument.
                // If an error occurs, we rely on the 'load' event listener.
                // console.warn("Could not check iframe readyState for race condition:", e);
            }
        };

        const existingIframe = document.querySelector('.utterances-frame');
        if (existingIframe) {
            processIframe(existingIframe);
        }

        // Set up the observer only if it hasn't been set up yet.
        // This ensures a single, persistent observer.
        if (!utterancesObserver) {
            utterancesObserver = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Check if the added node is the iframe itself
                                if (node.matches && node.matches('.utterances-frame')) {
                                    processIframe(node);
                                } else if (node.querySelector) {
                                    // Check if the added node contains an utterances-frame
                                    const iframe = node.querySelector('.utterances-frame');
                                    if (iframe) {
                                        processIframe(iframe);
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Observe the entire documentElement for wider compatibility.
            utterancesObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    // Function to apply the stored theme on page load
    const applyStoredTheme = () => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark') {
            body.classList.add('dark-mode');
            document.documentElement.setAttribute('data-theme', 'dark'); // Ensure data-theme is set
            if (themeToggle) themeToggle.textContent = 'Light Mode 🌻';
            utterancesTheme(); // Call new function
        } else {
            body.classList.remove('dark-mode');
            document.documentElement.setAttribute('data-theme', 'light'); // Ensure data-theme is set
            if (themeToggle) themeToggle.textContent = 'Dark Mode 🌕';
            utterancesTheme(); // Call new function
        }
    };

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                document.documentElement.setAttribute('data-theme', 'dark'); // Ensure data-theme is set
                themeToggle.textContent = 'Light Mode 🌻';
                utterancesTheme(); // Call new function
            } else {
                localStorage.setItem('theme', 'light');
                document.documentElement.setAttribute('data-theme', 'light'); // Ensure data-theme is set
                themeToggle.textContent = 'Dark Mode 🌕';
                utterancesTheme(); // Call new function
            }
        });
    }

    // Apply the stored theme when the DOM is fully loaded
    applyStoredTheme();
});
