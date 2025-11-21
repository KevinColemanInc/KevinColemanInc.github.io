/**
 * MultiSelect Component
 * A reusable vanilla JavaScript component for selecting multiple items from a list.
 *
 * Features:
 * - Displays selected items as removable tags/chips.
 * - Dropdown with search/filter functionality.
 * - Keyboard navigation (Up/Down, Enter/Space, Esc).
 * - "Select All" and "Clear All" actions.
 * - Efficient rendering for large lists (~200 items).
 *
 * Usage:
 * const myMultiSelect = new MultiSelect(
 *   'my-container-id', // ID of the HTML element where the component will be rendered
 *   [
 *     { id: '1', label: 'Option 1' },
 *     { id: '2', label: 'Option 2' },
 *     // ... up to 200 options
 *   ], // Array of options: { id: string | number; label: string }
 *   ['1'], // Initial selected IDs (array of string | number)
 *   (selectedIds) => { console.log('Selected IDs:', selectedIds); }
 * );
 *
 * To add new items to the list:
 * Update the `options` array passed to `setOptions` method of the MultiSelect instance.
 * e.g., `myMultiSelect.setOptions([...myMultiSelect.options, { id: 'new', label: 'New Item' }]);`
 *
 * To remove items from the list:
 * Update the `options` array passed to `setOptions` method, excluding the items to be removed.
 * e.g., `myMultiSelect.setOptions(myMultiSelect.options.filter(opt => opt.id !== 'removed-id'));`
 *
 * To hook this into a form or state management:
 * The `onChange` callback provides the `selectedIds` array whenever the selection changes.
 * This array can be used to update your application's state or hidden form fields.
 */
class MultiSelect {
    constructor(containerId, options, value, onChange, config = {}) {
        this.containerEl = document.getElementById(containerId);
        if (!this.containerEl) {
            console.error('MultiSelect: Container element not found for ID:', containerId);
            return;
        }

        this.options = options; // All available options
        this.selectedIds = new Set(value); // Currently selected option IDs
        this.onChange = onChange; // Callback for when selection changes
        this.maxSelections =
            typeof config.maxSelections === 'number'
                ? config.maxSelections
                : Infinity;
        this.onLimitReached =
            typeof config.onLimitReached === 'function'
                ? config.onLimitReached
                : null;

        this.isOpen = false;
        this.searchTerm = '';
        this.activeOptionIndex = -1; // For keyboard navigation

        this.render();
        this.addEventListeners();
    }

    // --- State Management ---
    setOptions(newOptions) {
        this.options = newOptions;
        // Re-evaluate selectedIds to ensure they still exist in newOptions and honor max
        const validSelections = [];
        for (const id of this.selectedIds) {
            if (!newOptions.some(opt => opt.id === id)) continue;
            validSelections.push(id);
            if (validSelections.length >= this.maxSelections) break;
        }
        this.selectedIds = new Set(validSelections);
        this.renderOptions();
    }

    setValue(newValue) {
        const validIds = [];
        for (const id of newValue) {
            if (validIds.length >= this.maxSelections) break;
            if (this.options.some(opt => opt.id === id)) {
                validIds.push(id);
            }
        }
        this.selectedIds = new Set(validIds);
        this.renderOptions();
    }

    // --- Rendering ---
    render() {
        this.containerEl.innerHTML = ''; // Clear existing content

        // Dropdown toggle (input field)
        this.dropdownToggleEl = document.createElement('input');
        this.dropdownToggleEl.type = 'text';
        this.dropdownToggleEl.className = 'multi-select-dropdown-toggle glass-input';
        this.dropdownToggleEl.placeholder = 'Select or search...';
        this.dropdownToggleEl.readOnly = true;
        this.containerEl.appendChild(this.dropdownToggleEl);

        // Dropdown list container
        this.dropdownListEl = document.createElement('div');
        this.dropdownListEl.className = 'multi-select-dropdown-list-container';
        this.dropdownListEl.style.display = this.isOpen ? 'block' : 'none';
        this.containerEl.appendChild(this.dropdownListEl);

        // Search input within dropdown
        this.searchInputEl = document.createElement('input');
        this.searchInputEl.type = 'text';
        this.searchInputEl.className = 'multi-select-search-input glass-input';
        this.searchInputEl.placeholder = 'Search...';
        this.dropdownListEl.appendChild(this.searchInputEl);

        // Action buttons (Select All / Clear All)
        const actionButtonsEl = document.createElement('div');
        actionButtonsEl.className = 'multi-select-action-buttons';
        this.dropdownListEl.appendChild(actionButtonsEl);

        this.selectAllButton = document.createElement('button');
        this.selectAllButton.textContent = 'Select All';
        this.selectAllButton.type = 'button';
        actionButtonsEl.appendChild(this.selectAllButton);

        this.clearAllButton = document.createElement('button');
        this.clearAllButton.textContent = 'Clear All';
        this.clearAllButton.type = 'button';
        actionButtonsEl.appendChild(this.clearAllButton);

        // Options container
        this.optionsContainerEl = document.createElement('div');
        this.optionsContainerEl.className = 'multi-select-options-container';
        this.dropdownListEl.appendChild(this.optionsContainerEl);

        this.renderOptions();
    }

    renderOptions() {
        this.optionsContainerEl.innerHTML = '';
        const filteredOptions = this.options.filter(option =>
            option.label.toLowerCase().includes(this.searchTerm.toLowerCase())
        );

        if (filteredOptions.length === 0) {
            const noResultsEl = document.createElement('div');
            noResultsEl.className = 'multi-select-no-results';
            noResultsEl.textContent = 'No results found.';
            this.optionsContainerEl.appendChild(noResultsEl);
            return;
        }

        filteredOptions.forEach((option, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'multi-select-option';
            if (index === this.activeOptionIndex) {
                optionEl.classList.add('active');
            }
            optionEl.setAttribute('data-id', option.id);
            optionEl.innerHTML = `
                <input type="checkbox" id="multi-select-${option.id}" ${this.selectedIds.has(option.id) ? 'checked' : ''}>
                <label for="multi-select-${option.id}">${option.label}</label>
            `;
            this.optionsContainerEl.appendChild(optionEl);
        });
    }

    // --- Event Handlers ---
    addEventListeners() {
        // Toggle dropdown
        this.dropdownToggleEl.addEventListener('click', () => this.toggleDropdown());
        // Search input
        this.searchInputEl.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.activeOptionIndex = -1; // Reset active option on search
            this.renderOptions();
        });
        // Option selection
        this.optionsContainerEl.addEventListener('change', (e) => {
            const checkbox = e.target;
            if (checkbox.type === 'checkbox') {
                const optionId = checkbox.closest('.multi-select-option').getAttribute('data-id');
                this.toggleOption(optionId, checkbox.checked);
            }
        });
        // Select All
        this.selectAllButton.addEventListener('click', () => this.selectAll());
        // Clear All
        this.clearAllButton.addEventListener('click', () => this.clearAll());
        // Keyboard navigation
        this.dropdownListEl.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
        this.dropdownToggleEl.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e)); // Allow closing with Esc from toggle

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.containerEl.contains(e.target) && this.isOpen) {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        this.isOpen = !this.isOpen;
        this.dropdownListEl.style.display = this.isOpen ? 'block' : 'none';
        if (this.isOpen) {
            this.searchInputEl.focus();
            this.activeOptionIndex = -1; // Reset active option on open
            this.renderOptions();
        } else {
            this.searchTerm = ''; // Clear search on close
            this.renderOptions();
        }
    }

    closeDropdown() {
        this.isOpen = false;
        this.dropdownListEl.style.display = 'none';
        this.searchTerm = ''; // Clear search on close
        this.renderOptions();
        this.dropdownToggleEl.focus(); // Return focus to toggle
    }

    toggleOption(optionId, isSelected) {
        if (isSelected) {
            if (this.selectedIds.has(optionId)) {
                return;
            }
            if (this.selectedIds.size >= this.maxSelections) {
                if (this.onLimitReached) {
                    this.onLimitReached(this.maxSelections);
                }
                this.renderOptions();
                return;
            }
            this.selectedIds.add(optionId);
        } else if (this.selectedIds.has(optionId)) {
            this.selectedIds.delete(optionId);
        } else {
            return;
        }
        this.renderOptions(); // Update checkboxes in options list
        this.onChange(Array.from(this.selectedIds)); // Notify parent
    }

    selectAll() {
        const newSelection = new Set(this.selectedIds);
        for (const option of this.options) {
            if (newSelection.size >= this.maxSelections) break;
            newSelection.add(option.id);
        }
        if (newSelection.size === this.selectedIds.size) {
            if (this.onLimitReached && this.selectedIds.size >= this.maxSelections) {
                this.onLimitReached(this.maxSelections);
            }
            return;
        }
        this.selectedIds = newSelection;
        this.renderOptions();
        this.onChange(Array.from(this.selectedIds));
        if (this.onLimitReached && this.selectedIds.size >= this.maxSelections) {
            this.onLimitReached(this.maxSelections);
        }
    }

    clearAll() {
        this.selectedIds.clear();
        this.renderSelectedTags();
        this.renderOptions();
        this.onChange(Array.from(this.selectedIds));
    }

    handleKeyboardNavigation(e) {
        const filteredOptions = this.options.filter(option =>
            option.label.toLowerCase().includes(this.searchTerm.toLowerCase())
        );

        if (e.key === 'Escape') {
            this.closeDropdown();
            e.preventDefault();
            return;
        }

        if (!this.isOpen && e.key === 'Enter') {
            this.toggleDropdown();
            e.preventDefault();
            return;
        }

        if (!this.isOpen) return; // Only navigate if dropdown is open

        if (e.key === 'ArrowDown') {
            this.activeOptionIndex = (this.activeOptionIndex + 1) % filteredOptions.length;
            this.renderOptions();
            this.scrollActiveOptionIntoView();
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            this.activeOptionIndex = (this.activeOptionIndex - 1 + filteredOptions.length) % filteredOptions.length;
            this.renderOptions();
            this.scrollActiveOptionIntoView();
            e.preventDefault();
        } else if (e.key === 'Enter' || e.key === ' ') {
            if (this.activeOptionIndex !== -1 && filteredOptions[this.activeOptionIndex]) {
                const activeOptionId = filteredOptions[this.activeOptionIndex].id;
                const isSelected = this.selectedIds.has(activeOptionId);
                this.toggleOption(activeOptionId, !isSelected);
                e.preventDefault();
            }
        }
    }

    scrollActiveOptionIntoView() {
        const activeEl = this.optionsContainerEl.querySelector('.multi-select-option.active');
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }
}

function getCssVarValue(varName, fallback = '') {
    if (typeof window === 'undefined' || !window.getComputedStyle) return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return value ? value.trim() : fallback;
}

// Constants
const CALORIES_PER_POUND = 3500;
const POUNDS_TO_KG = 0.45359237;
const DAYS_PER_YEAR = 365;
const MAX_SELECTED_FOODS = 5;
const DEFAULT_CHART_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif';
const PACKAGE_FREQUENCY_HINT = "For packaged snacks/foods, enter how often you buy the entire package (e.g., a box of Oreos).";
const PACKAGE_CATEGORIES = new Set(['food', 'snack']);

if (typeof window !== 'undefined' && window.Chart) {
    const chartTextColor = getCssVarValue('--text-main', '#f7f8ff') || '#f7f8ff';
    Chart.defaults.color = chartTextColor;
    Chart.defaults.font = Chart.defaults.font || {};
    Chart.defaults.font.family = DEFAULT_CHART_FONT;
    Chart.defaults.font.size = 13;
    Chart.defaults.font.weight = '500';
}

// Global state
let foodList = []; // Stores all food items loaded from CSV
let customFoods = []; // Stores custom food entries created by the user
let customFoodCounter = 0;
let foodMultiSelect = null; // Instance of the MultiSelect component
let selectedFoodIds = new Set(); // Stores IDs of selected food items (from MultiSelect)
let currentFrequency = "daily";
let currentUnit = "lb";
let chartInstance = null;
let lastDailyExtraCalories = 0;

// DOM references
const customFieldsEl = document.getElementById("custom-fields");
const customNameEl = document.getElementById("custom-name");
const customCalEl = document.getElementById("custom-cal");
const customPerEl = document.getElementById("custom-per");
const caloriesPerContainerEl = document.getElementById("calories-per-container");
const servingsInputEl = document.getElementById("servings-input");
const frequencyGroupEl = document.getElementById("frequency-group");
const frequencyHelperEl = document.getElementById("frequency-helper");
const unitGroupEl = document.getElementById("unit-group");
const calculateBtnEl = document.getElementById("calculate-btn");
const dailyExtraEl = document.getElementById("daily-extra");
const chartEmptyEl = document.getElementById("chart-empty");
const summarySectionEl = document.getElementById("summary-section");
const selectedFoodsSummaryEl = document.getElementById("selected-foods-summary");
const selectedFoodsListEl = document.getElementById("selected-foods-list");
const aggregateCaloriesEl = document.getElementById("aggregate-calories");
const selectionLimitEl = document.getElementById("selection-limit");
const customFoodsListEl = document.getElementById("custom-foods-list");
const customFoodErrorEl = document.getElementById("custom-food-error");
const showCustomFoodFormBtn = document.getElementById("show-custom-food-form");
const addCustomFoodBtn = document.getElementById("add-custom-food-btn");
const cancelCustomFoodBtn = document.getElementById("cancel-custom-food-btn");
const catSvgEl = document.getElementById("cat-svg");
const summary1yEl = document.getElementById("summary-1y");
const summary5yEl = document.getElementById("summary-5y");
const csvErrorEl = document.getElementById("csv-error");
const chartCanvas = document.getElementById("projection-chart");

// --- Data & State Management Functions ---

/**
 * Parses CSV text into a structured food list.
 * Custom foods are handled separately by the user-facing form.
 */
function parseFoodCsv(csvText) {
    const lines = csvText.trim().split("\n");
    if (lines.length <= 1) {
        foodList = [];
    } else {
        const rows = lines.slice(1); // skip header
        foodList = rows
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => {
                const parts = line.split(",");
                const [
                    shortName,
                    bigName,
                    calories,
                    perContainer,
                    category,
                ] = parts;
                const shortLabel = (shortName || "").trim();
                const bigLabel = (bigName || "").trim() || shortLabel;
                const caloriesNumber = Number(calories);
                const perContainerNumber = Number(perContainer);
                return {
                    id: shortLabel, // Use shortName as unique ID
                    label: shortLabel,
                    selectedLabel: bigLabel,
                    shortName: shortLabel,
                    bigName: bigLabel,
                    calories: caloriesNumber,
                    perContainer: perContainerNumber,
                    category: (category || "").trim(),
                };
            })
            .filter(
                (f) =>
                    !Number.isNaN(f.calories) &&
                    !Number.isNaN(f.perContainer) &&
                    f.shortName.length > 0,
            );
    }

    if (selectedFoodIds.size === 0) {
        const defaultMocha = foodList.find(
            (item) => item.shortName.toLowerCase() === "mocha",
        );
        if (defaultMocha) {
            selectedFoodIds.add(defaultMocha.id);
        }
    }
}

function getAllFoodOptions() {
    return [...foodList, ...customFoods];
}

function getFoodById(id) {
    return foodList.find((f) => f.id === id) || customFoods.find((f) => f.id === id);
}

/**
 * Loads foodlist.csv and initializes the MultiSelect component.
 *
 * How to remove items from the list:
 * Remove items from the `foodList` array (e.g., using `filter`).
 * Then, call `foodMultiSelect.setOptions(foodList);` to update the MultiSelect component.
 * The MultiSelect component automatically deselects removed items if they were previously selected.
 */
function loadFoodList() {
    fetch("foodlist.csv")
        .then((response) => {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.text();
        })
        .then((text) => {
            parseFoodCsv(text);
            initializeFoodMultiSelect();
        })
        .catch((error) => {
            console.error("Error loading foodlist.csv:", error);
            csvErrorEl.textContent =
                "Could not load foodlist.csv. Custom input still works.";
            csvErrorEl.style.display = "block";
            parseFoodCsv(''); // Initialize with just custom food
            initializeFoodMultiSelect();
        });
}

/**
 * Initializes the MultiSelect component with food data.
 */
function initializeFoodMultiSelect() {
    // Ensure customFieldsEl exists before trying to access it
    if (!customFieldsEl) {
        console.error("Custom fields element not found.");
        return;
    }

    foodMultiSelect = new MultiSelect(
        'multi-select-food-container', // HTML container ID
        getAllFoodOptions(), // All food options
        Array.from(selectedFoodIds), // Currently selected food IDs
        handleMultiSelectChange, // Callback for when selection changes
        {
            maxSelections: MAX_SELECTED_FOODS,
            onLimitReached: handleSelectionLimitReached
        }
    );

    // Initial update of calories summary based on current selections
    updateCaloriesSummary();
    renderSelectedFoodsSummary();
    updateSelectionLimitMessage();
    renderCustomFoodsList();
    hideCustomFoodForm();
    resetCustomFoodForm();
    updateFrequencyHelper();
}


/**
 * Callback function for when the MultiSelect component's selection changes.
 * This function updates the application's `selectedFoodIds` state and triggers
 * re-rendering of dependent UI elements.
 *
 * How to hook this into a form or state management:
 * The `newSelectedIds` array can be used to update a hidden form input,
 * a global state management system (like Redux, Vuex, etc.), or simply
 * update local application variables as done here with `selectedFoodIds`.
 * @param {Array<string | number>} newSelectedIds - The new array of selected food item IDs.
 */
function handleMultiSelectChange(newSelectedIds) {
    selectedFoodIds = new Set(newSelectedIds);
    updateCaloriesSummary();
    renderSelectedFoodsSummary();
    updateSelectionLimitMessage();
    updateFrequencyHelper();
}

/**
 * Gets the total aggregate calories from all selected food items,
 * including any custom foods that were added via the form.
 */
function getAggregateCalories() {
    let totalCals = 0;
    selectedFoodIds.forEach(id => {
        const foodItem = getFoodById(id);
        if (foodItem) {
            totalCals += foodItem.calories * foodItem.perContainer;
        }
    });
    return totalCals;
}

/**
 * Renders the summary list of selected foods and their calories.
 */
function renderSelectedFoodsSummary() {
    selectedFoodsListEl.innerHTML = '';
    const selectedFoodDetails = Array.from(selectedFoodIds)
        .map(id => getFoodById(id))
        .filter(item => item !== undefined); // Filter out any undefined items if IDs don't match

    if (selectedFoodDetails.length === 0) {
        selectedFoodsSummaryEl.style.display = 'none';
        return;
    }

    selectedFoodsSummaryEl.style.display = 'block';
    let totalAggregateCalories = 0;

    selectedFoodDetails.forEach(item => {
        const listItem = document.createElement('li');
        const itemCalories = item.calories * item.perContainer;
        const itemLabel = item.bigName || item.name || item.shortName || 'Custom Food';
        const infoSpan = document.createElement('span');
        infoSpan.textContent = `${itemLabel} - ${itemCalories} kcal`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-selected-item';
        removeBtn.setAttribute('data-id', item.id);

        listItem.appendChild(infoSpan);
        listItem.appendChild(removeBtn);
        totalAggregateCalories += itemCalories;
        selectedFoodsListEl.appendChild(listItem);
    });
    aggregateCaloriesEl.textContent = `Total: ${totalAggregateCalories} kcal`;
}

function updateFrequencyHelper() {
    if (!frequencyHelperEl) return;
    const hasPackageItem = Array.from(selectedFoodIds).some(id => {
        const food = getFoodById(id);
        if (!food || !food.category) return false;
        const category = food.category.toLowerCase();
        return PACKAGE_CATEGORIES.has(category);
    });

    if (hasPackageItem) {
        frequencyHelperEl.textContent = PACKAGE_FREQUENCY_HINT;
    } else {
        frequencyHelperEl.textContent = '';
    }
}

function updateCatFatness(value) {
    if (!catSvgEl) return;
    const clampedValue = Math.max(0.5, Math.min(3, Number(value) || 1));
    catSvgEl.style.setProperty('--fatness', clampedValue);
}

function showCustomFoodForm() {
    if (!customFieldsEl || !showCustomFoodFormBtn) return;
    customFieldsEl.style.display = 'block';
    customFieldsEl.setAttribute('aria-hidden', 'false');
    showCustomFoodFormBtn.style.display = 'none';
    setCustomFoodError('');
    setTimeout(() => customNameEl && customNameEl.focus(), 0);
}

function hideCustomFoodForm() {
    if (!customFieldsEl || !showCustomFoodFormBtn) return;
    customFieldsEl.style.display = 'none';
    customFieldsEl.setAttribute('aria-hidden', 'true');
    showCustomFoodFormBtn.style.display = 'block';
    setCustomFoodError('');
}

function resetCustomFoodForm() {
    if (!customNameEl || !customCalEl || !customPerEl) return;
    customNameEl.value = '';
    customCalEl.value = '';
    customPerEl.value = '1';
}

function setCustomFoodError(message) {
    if (!customFoodErrorEl) return;
    if (message) {
        customFoodErrorEl.textContent = message;
        customFoodErrorEl.style.display = 'block';
    } else {
        customFoodErrorEl.textContent = '';
        customFoodErrorEl.style.display = 'none';
    }
}

function addCustomFoodFromForm() {
    if (!customNameEl || !customCalEl || !customPerEl) return;
    const name = customNameEl.value.trim();
    const calories = Number(customCalEl.value);
    const perContainer = Number(customPerEl.value);

    if (!name) {
        setCustomFoodError('Please provide a label for your custom food.');
        return;
    }
    if (Number.isNaN(calories) || calories <= 0) {
        setCustomFoodError('Calories per serving must be greater than zero.');
        return;
    }
    if (Number.isNaN(perContainer) || perContainer <= 0) {
        setCustomFoodError('Servings per container must be greater than zero.');
        return;
    }

    const totalCalories = calories * perContainer;
    const newFood = {
        id: `custom-${Date.now()}-${customFoodCounter++}`,
        label: name,
        selectedLabel: name,
        shortName: name,
        bigName: name,
        name,
        calories,
        perContainer,
        category: 'Custom',
    };

    customFoods = [...customFoods, newFood];
    renderCustomFoodsList();

    if (!foodMultiSelect) {
        selectedFoodIds.add(newFood.id);
        updateCaloriesSummary();
        renderSelectedFoodsSummary();
        updateSelectionLimitMessage();
        updateFrequencyHelper();
    } else {
        refreshFoodOptions(() => {
            foodMultiSelect.toggleOption(newFood.id, true);
        });
    }
    resetCustomFoodForm();
    hideCustomFoodForm();
}

function renderCustomFoodsList() {
    if (!customFoodsListEl) return;
    customFoodsListEl.innerHTML = '';
    if (customFoods.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.textContent = 'No custom foods yet.';
        emptyState.style.opacity = '0.6';
        customFoodsListEl.appendChild(emptyState);
        return;
    }

    customFoods.forEach(food => {
        const listItem = document.createElement('li');
        const infoSpan = document.createElement('span');
        infoSpan.textContent = `${food.name || food.shortName} — ${(food.calories * food.perContainer).toFixed(0)} kcal`;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.setAttribute('data-id', food.id);
        listItem.appendChild(infoSpan);
        listItem.appendChild(removeBtn);
        customFoodsListEl.appendChild(listItem);
    });
}

function refreshFoodOptions(afterRefresh) {
    if (!foodMultiSelect) return;
    foodMultiSelect.setOptions(getAllFoodOptions());
    handleMultiSelectChange(Array.from(foodMultiSelect.selectedIds));
    if (typeof afterRefresh === 'function') {
        afterRefresh();
    }
}

function removeCustomFood(foodId) {
    const nextCustomFoods = customFoods.filter(food => food.id !== foodId);
    if (nextCustomFoods.length === customFoods.length) {
        return;
    }
    customFoods = nextCustomFoods;
    renderCustomFoodsList();
    if (!foodMultiSelect) {
        selectedFoodIds.delete(foodId);
        updateCaloriesSummary();
        renderSelectedFoodsSummary();
        updateSelectionLimitMessage();
        updateFrequencyHelper();
    } else {
        refreshFoodOptions();
    }
}

function updateSelectionLimitMessage() {
    if (!selectionLimitEl) return;
    const count = selectedFoodIds.size;
    const baseText = `Selected ${count}/${MAX_SELECTED_FOODS} foods`;
    if (count >= MAX_SELECTED_FOODS) {
        selectionLimitEl.textContent = `${baseText} (limit reached)`;
        selectionLimitEl.classList.add('limit-reached');
    } else {
        selectionLimitEl.textContent = `${baseText}`;
        selectionLimitEl.classList.remove('limit-reached');
    }
}

function handleSelectionLimitReached(limit) {
    if (!selectionLimitEl) return;
    selectionLimitEl.textContent = `You've reached the ${limit}-food limit. Remove one before adding more.`;
    selectionLimitEl.classList.add('limit-reached');
}

/**
 * Updates the calorie summary display and calculation button state.
 */
function updateCaloriesSummary() {
    const cals = getAggregateCalories();
    if (cals > 0) {
        caloriesPerContainerEl.textContent =
            "Calories per container: " + cals.toFixed(0) + " kcal";
    } else {
        caloriesPerContainerEl.textContent = "";
    }

    const servings = Number(servingsInputEl.value);
    const daysPerPeriod = frequencyToDays(currentFrequency);
    const dailyExtra =
        cals > 0 && servings > 0
            ? (cals * servings) / daysPerPeriod
            : 0;
    lastDailyExtraCalories = dailyExtra;

    if (dailyExtra > 0) {
        dailyExtraEl.textContent =
            "This adds approximately " +
            dailyExtra.toFixed(0) +
            " kcal/day.";
    } else {
        dailyExtraEl.textContent = "";
        updateCatFatness(1);
    }

    calculateBtnEl.disabled = dailyExtra <= 0;
}

// --- Chart and Calculation Logic ---

function frequencyToDays(frequency) {
    switch (frequency) {
        case "daily":
            return 1;
        case "weekly":
            return 7;
        case "monthly":
            return 30.437; // Average days in a month
        default:
            return 1;
    }
}

function renderChart(dailyExtraCalories, unit) {
    chartEmptyEl.style.display = "none";
    summarySectionEl.style.display = "block";

    const textMainColor = getCssVarValue('--text-main', '#f7f8ff') || '#f7f8ff';
    const textMutedColor = getCssVarValue('--text-muted', '#aab0c7') || '#aab0c7';
    const gridColor = 'rgba(255, 255, 255, 0.2)';

    const labels = Array.from({ length: 61 }, (_, i) => i); // 0 to 60 months
    const data = labels.map((month) => {
        const days = month * (DAYS_PER_YEAR / 12);
        const totalCalories = dailyExtraCalories * days;
        const weightChangePounds = totalCalories / CALORIES_PER_POUND;
        return unit === "kg"
            ? weightChangePounds * POUNDS_TO_KG
            : weightChangePounds;
    });

    // Update summary cards
    const weightAfter1Year = data[12] || 0; // Data at 12 months
    const weightAfter5Years = data[60] || 0; // Data at 60 months

    summary1yEl.textContent = `${weightAfter1Year.toFixed(1)} ${unit}`;
    summary5yEl.textContent = `${weightAfter5Years.toFixed(1)} ${unit}`;

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels: labels.map((m) => (m % 12 === 0 ? `Year ${m / 12}` : m.toString())),
            datasets: [
                {
                    label: `Weight Change (${unit})`,
                    data: data,
                    borderColor: "rgb(75, 192, 192)",
                    tension: 0.1,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Months",
                        color: textMutedColor,
                    },
                    grid: {
                        color: gridColor,
                    },
                    ticks: {
                        color: textMainColor,
                        callback: function(val, index) {
                            return index % 12 === 0 ? `Year ${val/12}` : '';
                        }
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: `Weight Change (${unit})`,
                        color: textMutedColor,
                    },
                    grid: {
                        color: gridColor,
                    },
                    ticks: {
                        color: textMainColor,
                    },
                },
            },
            plugins: {
                legend: {
                    labels: {
                        color: textMainColor,
                    },
                },
            },
        },
    });
}

// --- Event Listeners ---

if (showCustomFoodFormBtn) {
    showCustomFoodFormBtn.addEventListener("click", showCustomFoodForm);
}

if (cancelCustomFoodBtn) {
    cancelCustomFoodBtn.addEventListener("click", () => {
        hideCustomFoodForm();
        resetCustomFoodForm();
    });
}

if (addCustomFoodBtn) {
    addCustomFoodBtn.addEventListener("click", addCustomFoodFromForm);
}

if (customFoodsListEl) {
    customFoodsListEl.addEventListener("click", (event) => {
        const target = event.target;
        if (target.tagName.toLowerCase() !== "button") return;
        const foodId = target.getAttribute("data-id");
        if (foodId) {
            removeCustomFood(foodId);
        }
    });
}

if (selectedFoodsListEl) {
    selectedFoodsListEl.addEventListener("click", (event) => {
        const target = event.target;
        if (!target.classList.contains('remove-selected-item')) return;
        const foodId = target.getAttribute('data-id');
        if (!foodId) return;
        if (foodMultiSelect) {
            foodMultiSelect.toggleOption(foodId, false);
        } else {
            selectedFoodIds.delete(foodId);
            handleMultiSelectChange(Array.from(selectedFoodIds));
        }
    });
}

servingsInputEl.addEventListener("input", updateCaloriesSummary);

frequencyGroupEl.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() === "button") {
        const freq = e.target.getAttribute("data-freq");
        if (!freq) return;
        currentFrequency = freq;
        Array.from(
            frequencyGroupEl.querySelectorAll("button")
        ).forEach((btn) => {
            btn.classList.toggle(
                "active",
                btn.getAttribute("data-freq") === freq,
            );
        });
        updateCaloriesSummary();
    }
});

unitGroupEl.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() === "button") {
        const unit = e.target.getAttribute("data-unit");
        if (!unit) return;
        currentUnit = unit;
        Array.from(unitGroupEl.querySelectorAll("button")).forEach(
            (btn) => {
                btn.classList.toggle(
                    "active",
                    btn.getAttribute("data-unit") === unit,
                );
            },
        );
        // Re-render chart and summary with same dailyExtra but new unit
        if (lastDailyExtraCalories > 0) {
            renderChart(lastDailyExtraCalories, currentUnit);
        }
    }
});

calculateBtnEl.addEventListener("click", () => {
    if (lastDailyExtraCalories <= 0) return;
    renderChart(lastDailyExtraCalories, currentUnit);
    updateCatFatness(2);
});

// Init
updateCatFatness(1);
loadFoodList();
