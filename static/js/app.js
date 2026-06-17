// Global State
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdateId = null;
let currentFilter = 'all';

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const refreshIcon = document.getElementById('refresh-icon');
const lastUpdatedText = document.getElementById('last-updated-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterChips = document.getElementById('filter-chips');
const feedStatus = document.getElementById('feed-status');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const feedList = document.getElementById('feed-list');
const btnResetFilters = document.getElementById('btn-reset-filters');

// Composer DOM Elements
const composerSidebar = document.getElementById('composer-sidebar');
const selectedUpdatePreview = document.getElementById('selected-update-preview');
const composerBody = document.getElementById('composer-body');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const charProgress = document.getElementById('char-progress');
const btnAddHashtags = document.getElementById('btn-add-hashtags');
const btnResetTweet = document.getElementById('btn-reset-tweet');
const btnCopyTweet = document.getElementById('btn-copy-tweet');
const copyBtnText = document.getElementById('copy-btn-text');
const btnSendTweet = document.getElementById('btn-send-tweet');
const closeComposerBtn = document.getElementById('close-composer');

// Toast DOM
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastIcon = document.getElementById('toast-icon');

// Progress Ring Configuration
const progressRingRadius = 14;
const progressRingCircumference = 2 * Math.PI * progressRingRadius;

// Initialize SVG Progress Ring
if (charProgress) {
    charProgress.style.strokeDasharray = `${progressRingCircumference} ${progressRingCircumference}`;
    charProgress.style.strokeDashoffset = progressRingCircumference;
}

// Create a Floating Action Button for Mobile
let mobileComposerBtn = null;
function initMobileComposerButton() {
    mobileComposerBtn = document.createElement('button');
    mobileComposerBtn.className = 'floating-composer-btn';
    mobileComposerBtn.innerHTML = '<i data-lucide="twitter"></i>';
    mobileComposerBtn.title = 'Open Composer';
    document.body.appendChild(mobileComposerBtn);
    
    mobileComposerBtn.addEventListener('click', () => {
        composerSidebar.classList.toggle('mobile-open');
        mobileComposerBtn.classList.remove('unread');
    });
}

// Format Relative Date Helper
function getRelativeTime(timestamp) {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// Fetch Feed Data
async function fetchReleaseNotes(forceRefresh = false) {
    // Show spinner & loading state
    btnRefresh.classList.add('loading');
    btnRefresh.disabled = true;
    
    feedList.style.display = 'none';
    feedStatus.style.display = 'block';
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    
    try {
        const url = `/api/releases?refresh=${forceRefresh}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.status === 'success' || result.status === 'warning') {
            allUpdates = result.data || [];
            
            // Set last updated time text
            const lastUpdatedTime = result.last_updated;
            lastUpdatedText.textContent = getRelativeTime(lastUpdatedTime);
            
            // Refresh Lucide Icons in static areas
            lucide.createIcons();
            
            updateCategoryCounts();
            filterAndRenderUpdates();
            
            if (result.status === 'warning') {
                showToast("Connected with cache fallback. Network unavailable.", "warning");
            }
        } else {
            throw new Error(result.message || "Unknown error fetching feed.");
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        showToast("Error loading release notes.", "error");
        
        feedStatus.style.display = 'block';
        loadingState.style.display = 'none';
        emptyState.style.display = 'flex';
    } finally {
        btnRefresh.classList.remove('loading');
        btnRefresh.disabled = false;
    }
}

// Count occurrences of each category
function updateCategoryCounts() {
    const counts = {
        all: allUpdates.length,
        feature: 0,
        announcement: 0,
        deprecation: 0,
        issue: 0,
        update: 0
    };
    
    allUpdates.forEach(update => {
        const type = update.type.toLowerCase();
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        } else {
            counts.update++; // Default updates fallback
        }
    });
    
    // Update DOM counts
    Object.keys(counts).forEach(key => {
        const countEl = document.getElementById(`count-${key}`);
        if (countEl) countEl.textContent = counts[key];
    });
}

// Filter and Render updates list
function filterAndRenderUpdates() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    
    filteredUpdates = allUpdates.filter(update => {
        // Apply Type Filter
        const typeMatch = currentFilter === 'all' || 
            (currentFilter === 'update' && !['feature', 'announcement', 'deprecation', 'issue'].includes(update.type.toLowerCase())) ||
            update.type.toLowerCase() === currentFilter;
            
        // Apply Search query match
        const searchMatch = !searchQuery || 
            update.text.toLowerCase().includes(searchQuery) ||
            update.type.toLowerCase().includes(searchQuery) ||
            update.date.toLowerCase().includes(searchQuery);
            
        return typeMatch && searchMatch;
    });
    
    // Manage Loading/Empty State
    loadingState.style.display = 'none';
    if (filteredUpdates.length === 0) {
        feedStatus.style.display = 'block';
        emptyState.style.display = 'flex';
        feedList.style.display = 'none';
    } else {
        feedStatus.style.display = 'none';
        emptyState.style.display = 'none';
        feedList.style.display = 'flex';
        
        // Render cards
        feedList.innerHTML = filteredUpdates.map(update => {
            const isSelected = update.id === selectedUpdateId ? 'selected' : '';
            const typeClass = `type-${normalizeTypeClass(update.type)}`;
            
            // Map types to beautiful Lucide icons
            const typeIcon = getTypeIconName(update.type);
            
            return `
                <div class="feed-card ${typeClass} ${isSelected}" data-id="${update.id}" id="card-${update.id}">
                    <div class="card-header">
                        <div class="card-meta">
                            <span class="card-badge">
                                <i data-lucide="${typeIcon}"></i>
                                ${update.type}
                            </span>
                            <span class="card-date">${update.date}</span>
                        </div>
                        <a href="${update.link}" class="card-link" target="_blank" rel="noopener noreferrer" title="View official release documentation">
                            <i data-lucide="external-link"></i>
                        </a>
                    </div>
                    <div class="card-body">
                        ${update.html}
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-select-tweet" onclick="event.stopPropagation(); selectUpdate('${update.id}')">
                            <i data-lucide="twitter"></i>
                            Select to Tweet
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Render SVG Icons inside feed cards
        lucide.createIcons();
    }
}

// Helpers for types
function normalizeTypeClass(type) {
    const t = type.toLowerCase();
    if (['feature', 'announcement', 'deprecation', 'issue'].includes(t)) {
        return t;
    }
    return 'update';
}

function getTypeIconName(type) {
    const t = type.toLowerCase();
    switch (t) {
        case 'feature': return 'sparkles';
        case 'announcement': return 'megaphone';
        case 'deprecation': return 'alert-triangle';
        case 'issue': return 'x-circle';
        default: return 'info';
    }
}

// Handle Select Update
function selectUpdate(id) {
    const update = allUpdates.find(u => u.id === id);
    if (!update) return;
    
    // Update selection state classes
    if (selectedUpdateId) {
        const prevSelected = document.getElementById(`card-${selectedUpdateId}`);
        if (prevSelected) prevSelected.classList.remove('selected');
    }
    
    selectedUpdateId = id;
    const currentCard = document.getElementById(`card-${id}`);
    if (currentCard) currentCard.classList.add('selected');
    
    // Fill Selected Update Preview area in Composer
    const typeClass = `type-${normalizeTypeClass(update.type)}`;
    selectedUpdatePreview.className = `selected-update-preview active ${typeClass}`;
    
    // Truncate details for preview text
    const displaySnippet = update.text.length > 150 ? update.text.substring(0, 150) + "..." : update.text;
    
    selectedUpdatePreview.innerHTML = `
        <div class="preview-meta">
            <span class="preview-badge card-badge">
                <i data-lucide="${getTypeIconName(update.type)}"></i>
                ${update.type}
            </span>
            <span class="preview-date">${update.date}</span>
        </div>
        <p class="preview-text">${displaySnippet}</p>
    `;
    lucide.createIcons();
    
    // Populate Tweet Draft
    const tweetDraft = generateTweetDraft(update);
    tweetTextarea.value = tweetDraft;
    
    // Show Composer fields
    composerBody.style.display = 'flex';
    updateCharCount();
    
    // Mobile slide drawer behavior
    if (window.innerWidth <= 1024) {
        composerSidebar.classList.add('mobile-open');
        if (mobileComposerBtn) {
            mobileComposerBtn.classList.add('unread');
        }
    }
}

// Generate Twitter prefill template
function generateTweetDraft(update) {
    // Basic templates formatting
    const header = `📢 BigQuery ${update.type} (${update.date}):\n`;
    const footer = `\n\nRead more: ${update.link}\n#BigQuery #GoogleCloud`;
    
    // Character Limit Constraints
    const maxChars = 280;
    const reservedChars = header.length + footer.length;
    const allowedBodyChars = maxChars - reservedChars;
    
    let textBody = update.text;
    if (textBody.length > allowedBodyChars) {
        // Truncate with elipses
        textBody = textBody.substring(0, allowedBodyChars - 3) + "...";
    }
    
    return `${header}${textBody}${footer}`;
}

// Update Tweet character counter and circular gauge
function updateCharCount() {
    const length = tweetTextarea.value.length;
    const limit = 280;
    const remaining = limit - length;
    
    charCount.textContent = remaining;
    
    // Class coloring based on remaining counts
    charCount.className = 'char-count';
    if (remaining < 0) {
        charCount.classList.add('danger');
    } else if (remaining <= 20) {
        charCount.classList.add('warning');
    }
    
    // Calculate Circular Progress Dashoffset
    if (charProgress) {
        let percent = (length / limit) * 100;
        if (percent > 100) percent = 100;
        
        const offset = progressRingCircumference - (percent / 100) * progressRingCircumference;
        charProgress.style.strokeDashoffset = offset;
        
        // Colors for circular progress ring
        if (remaining < 0) {
            charProgress.style.stroke = '#ef4444'; // Red
        } else if (remaining <= 20) {
            charProgress.style.stroke = '#fb7185'; // Coral/Rose
        } else {
            charProgress.style.stroke = '#38BDF8'; // Twitter Cyan
        }
    }
}

// Tool action: Add extra hashtags
function addHashtags() {
    if (!selectedUpdateId) return;
    
    const extraTags = " #DataEngineering #DataAnalytics";
    const currentText = tweetTextarea.value;
    
    // Check if hashtags are already there
    if (currentText.includes("#DataEngineering")) {
        showToast("Hashtags already added", "info");
        return;
    }
    
    tweetTextarea.value = currentText + extraTags;
    updateCharCount();
    showToast("Added extra tech tags!", "success");
}

// Tool action: Reset text back to original generated template
function resetTweetTemplate() {
    if (!selectedUpdateId) return;
    const update = allUpdates.find(u => u.id === selectedUpdateId);
    if (update) {
        tweetTextarea.value = generateTweetDraft(update);
        updateCharCount();
        showToast("Reset to default draft template", "info");
    }
}

// Copy draft text to clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Show success animation on button
        copyBtnText.textContent = "Copied!";
        const copyIcon = document.getElementById('copy-icon');
        copyIcon.setAttribute('data-lucide', 'check');
        lucide.createIcons();
        
        showToast("Copied tweet draft to clipboard!", "success");
        
        // Revert button text after 2 seconds
        setTimeout(() => {
            copyBtnText.textContent = "Copy Text";
            copyIcon.setAttribute('data-lucide', 'copy');
            lucide.createIcons();
        }, 2000);
        
    } catch (err) {
        console.error("Clipboard copy failed:", err);
        showToast("Clipboard write permission blocked.", "error");
    }
}

// Send tweet (Web Intent)
function sendTweetOnTwitter() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    // Build X Web Intent url
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
}

// Toast Notifications Helper
function showToast(message, type = "success") {
    toastMessage.textContent = message;
    
    // Set icons
    toast.className = 'toast';
    toastIcon.removeAttribute('data-lucide');
    
    if (type === 'success') {
        toastIcon.setAttribute('data-lucide', 'check-circle-2');
        toast.style.background = '#10B981'; // green
    } else if (type === 'error') {
        toastIcon.setAttribute('data-lucide', 'alert-circle');
        toast.style.background = '#EF4444'; // red
    } else if (type === 'warning') {
        toastIcon.setAttribute('data-lucide', 'alert-triangle');
        toast.style.background = '#F59E0B'; // orange
    } else {
        toastIcon.setAttribute('data-lucide', 'info');
        toast.style.background = '#3B82F6'; // blue
    }
    
    lucide.createIcons();
    
    toast.classList.add('show');
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

// Event Listeners Configuration
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch
    fetchReleaseNotes(false);
    
    // Mobile Composer buttons
    initMobileComposerButton();
    
    // Refresh action
    btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });
    
    // Search actions
    searchInput.addEventListener('input', () => {
        if (searchInput.value.length > 0) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        filterAndRenderUpdates();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        filterAndRenderUpdates();
        searchInput.focus();
    });
    
    // Chips filter actions
    filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        
        // Toggle Active state
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        currentFilter = chip.getAttribute('data-filter');
        filterAndRenderUpdates();
    });
    
    // Empty state reset button
    btnResetFilters.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        currentFilter = 'all';
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.chip[data-filter="all"]').classList.add('active');
        filterAndRenderUpdates();
    });
    
    // Close composer sidebar drawer on mobile
    closeComposerBtn.addEventListener('click', () => {
        composerSidebar.classList.remove('mobile-open');
    });
    
    // Textarea changes
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Composer action tools
    btnAddHashtags.addEventListener('click', addHashtags);
    btnResetTweet.addEventListener('click', resetTweetTemplate);
    btnCopyTweet.addEventListener('click', copyTweetToClipboard);
    btnSendTweet.addEventListener('click', sendTweetOnTwitter);
});
