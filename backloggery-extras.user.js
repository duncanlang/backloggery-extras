/* global GM_xmlhttpRequest */
// ==UserScript==
// @name         Letterboxd Extras
// @namespace    https://github.com/duncanlang
// @version      1.0.0
// @description  Adds a few additional features to Letterboxd.
// @author       Duncan Lang
// @match        https://backloggery.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==


// setTimeout(function(){ debugger; }, 5000);  - used to freeze the inspector

(function() { // eslint-disable-line wrap-iife

	'use strict'; // eslint-disable-line strict
	
	/* eslint-disable */
	GM_addStyle(`
		.blank-label-extras{
			cursor: default;
		}
		.filter-extras{
			margin-top: 15px;
		}
		.extras-filter-label{
			display: inline;
		}
		.extras-dropdown{
			padding: 5px;
		}
		.header-extras{
			margin-bottom: 5px !important;
		}
		.filter-button-extras {
			background: transparent;
			border: none;
			-webkit-box-flex: 1;
			-ms-flex: 1;
			flex: 1;
			height: 30px;
			margin: 0;
			max-width: 40px;
			padding-bottom: 2px;
		}
		.filter-button-extras svg {
			pointer-events: none;
		}
		.filter-div-extras {
			display: flex;
			width: 100%;
			height: 0px;
		}
	`);
	/* eslint-enable */

	const backloggery = {

		memoryCard: {

			lastLocation: window.location.pathname,

			memoryCard: null,
			months: ["ALL","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
			statuses: null,
			systems: null,

			// Filters
			filterStatus: "ALL",
			filterMonth: "ALL",
			filterSystem: "ALL",

			minHeight: 0,

			running: false,
			
			stopRunning() {
				this.running = false;
			},

			async init() {
				if (this.running) return;
				if (backloggery.storage.initialized == false) return;

				this.running = true;

				const history = document.querySelector('section.history')

				if (this.statuses == null){
					if (backloggery.storage.getSync('added-combined') === "added" || backloggery.storage.getSync('added-combined') === "other"){
						this.statuses = ["ALL","Added","Started","Beat","Completed","Endless","None"];
					}else{
						this.statuses = ["ALL","Added","Added (Unfinished)","Added (Beat)","Added (Completed)","Started","Beat","Completed","Endless","None"];
					}
				}

				// Check if we need to remove the class name
				// Because once the loader is gone, we will collect the history again
				if (document.querySelector('section.history.history-extras div.loader') != null){
					history.className = history.className.replace(' history-extras', '');
				}

				// Collect all of the history entries
				if (document.querySelector('.history-extras') == null && document.querySelector('section.history') != null && document.querySelector('section.history div.loader') == null){

					// Init
					this.memoryCard = new Array();
					this.systems = new Array();

					// Keep the date outside of the loop
					var date = "";
					var dateObject = null;
					var dateText = "";
					var year = "";
					var month = "";

					var headerAtt = "";

					// Loop
					var list = history.querySelector('div.list');
					var entries = list.childNodes;
					for (var i = 0; i < entries.length; i++){
						var entry = entries[i];

						// Date
						var header = entry.querySelector('h2');
						if (header != null){
							date = header.getAttribute('title');
							dateText = header.innerText;
							dateObject = new Date(date)
							year = dateObject.getUTCFullYear();
							month = dateObject.getUTCMonth() + 1;

							// I don't know if this attribute will change, so get it here
							for (const attr of header.attributes) {
								if (attr.name.startsWith('data-v-')) {
									headerAtt = attr.name
								  	break; // Exit the loop once found
								}
							}
						}
						else{
							// Create hidden Date Header
							const newDate = backloggery.helpers.createElement('h2', {
								class: 'extras-date-header',
								[headerAtt]: '',
								title: date
							},{
								display: 'none'
							});
							newDate.innerText = dateText;

							entry.prepend(newDate);
						}
						
						// Status
						var status = entry.querySelector('div').querySelector('div').innerText;
						if (backloggery.storage.getSync('added-combined') === "added" && status.includes('Added')){
							status = "Added";
						} else if (backloggery.storage.getSync('added-combined') === "other" && status.includes('Added')){
							if (status.includes('Unfinished')){
								status = "Added";
							} else if (status.includes('Started')){
								status = "Started";
							} else if (status.includes('Beat')){
								status = "Beat";
							} else if (status.includes('Completed')){
								status = "Completed";
							}
						}

						// System
						var system =entry.querySelector('div').querySelectorAll('div')[2].querySelector('span').innerText;
						system = system.replace('(','');
						system = system.replace(')','');

						if (!this.systems.includes(system))
							this.systems.push(system);

						// Create object
						var historyItem = {
							entry: entry,
							fullDate: date,
							year: year,
							month: month,
							status: status,
							system: system
						};

						// Add to the array
						this.memoryCard.push(historyItem);
					}

					// Create Blank entry
					const blankLabel = backloggery.helpers.createElement('p', {
						class: 'blank-label-extras'
					},
					{
						display: 'none'
					});
					blankLabel.innerText = "There are no results for the selected filters.";
					list.prepend(blankLabel);

					// Set the class on the history element so we know this has been collected already
					history.className += ' history-extras';

					// Sort the systems array
					this.systems.sort((a, b) => a.localeCompare(b));
					this.systems.unshift("ALL");

					// Add the filters to the page if not already added
					if (document.querySelector('.filter-extras') == null){
						// Add the filter button
						//************************************************************
						const div = backloggery.helpers.createElement('div', {
							class: 'filter-div-extras'
						});
						const spaceDiv = backloggery.helpers.createElement('div', {
							style: 'flex-grow: 2'
						});
						div.append(spaceDiv);

						const button = backloggery.helpers.createElement('button', {
							class: 'option filter-button-extras',
							title: 'Filter',
							target: 'filter-extras'
						});
						button.innerHTML = '<svg id="filter" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M0 0h24m0 24H0" fill="none"></path><path d="M4.25 5.66c.1.13 5.74 7.33 5.74 7.33V19c0 .55.45 1 1.01 1h2.01c.55 0 1.01-.45 1.01-1v-6.02s5.49-7.02 5.75-7.34C20.03 5.32 20 5 20 5c0-.55-.45-1-1.01-1H5.01C4.4 4 4 4.48 4 5c0 .2.06.44.25.66z"></path></svg>';
						div.append(button);

						// Add to the page
						document.querySelector(".history-extras p").before(div);
						
						// Add on change event for the dropdowns to trigger the filter function
						$(".filter-button-extras").on('click', function(event){
							ToggleFilters(event, backloggery);
						});

						// Create the Filter Section
						//************************************************************
						const container = backloggery.helpers.createElement('div', {
							class: 'filter-extras'
						});
						const header = backloggery.helpers.createElement('h1', {
							class: 'header-extras'
						});
						header.innerText = "Filters";
						container.append(header);

						// Create the dropdown UIs
						this.CreateDropDown(container, "status-dropdown", "Status: ", this.statuses);
						this.CreateDropDown(container, "month-dropdown", "Month: ", this.months);
						this.CreateDropDown(container, "system-dropdown", "System: ", this.systems);

						// Add text
						const subHeader = backloggery.helpers.createElement('p', {
							class: 'subheader-extras'
						});
						container.append(subHeader);

						// Add to the page
						document.querySelector(".history-extras p").append(container);

						// Add on change event for the dropdowns to trigger the filter function
						$(".extras-dropdown").on('change', function(event){
							filterMemoryCard(event, backloggery);
						});

						if (backloggery.storage.getLocal('history-filter-show') === 'hide'){
							$(".filter-button-extras").click();
						}
					}
					else{
						// Update the existing filers
						this.SelectDownDown('status-dropdown', 'ALL');
						this.SelectDownDown('month-dropdown', 'ALL');
						this.SelectDownDown('system-dropdown', 'ALL');

						this.UpdateDropDown('system-dropdown', this.systems);
					}
					this.UpdateSubHeader(this.memoryCard.length);
				}

				// Stop
				return this.stopRunning();
			},

			CreateDropDown(parent, id, text, values){
				var select = document.createElement("select");
				select.name = id;
				select.id = id;
				select.className = "extras-dropdown";
			 
				for (const val of values)
				{
					var option = document.createElement("option");
					option.value = val;
					option.text = val;
					select.appendChild(option);
				}

				var label = document.createElement("label");
				label.innerText = text;
				label.htmlFor = id;
				label.style['margin-right'] = "15px";
				label.className = 'extras-filter-label';
			 
				parent.appendChild(label).appendChild(select);
			},

			UpdateDropDown(id, values){
				let element = document.getElementById(id);

				// Remove current values (except the first, "ALL")
				while (element.children.length > 1) {
					element.removeChild(element.lastChild);
				}
				
				for (const val of values)
				{
					if (val != 'ALL'){
						var option = document.createElement("option");
						option.value = val;
						option.text = val;
						element.appendChild(option);
					}
				}

			},

			SelectDownDown(id, value){
				let element = document.getElementById(id);
				element.value = value;
			},

			UpdateSubHeader(count){
				const subHeader = document.querySelector('.subheader-extras');
				subHeader.innerText = 'There are ' + count + " entries matching your filters.";
			}

		},

		helpers: {
			createElement(tag, attrs, styles) {
				const element = document.createElement(tag);
				for (const aKey in attrs) {
					if (!Object.prototype.hasOwnProperty.call(attrs, aKey)) continue;
					element.setAttribute(aKey, attrs[aKey]);
				}
				for (const sKey in styles) {
					if (!Object.prototype.hasOwnProperty.call(styles, sKey)) continue;
					element.style[sKey] = styles[sKey];
				}
				return element;
			}
		},

		storage: {
			dataLocal: {},
			dataSync: {},
			initialized: false,

			async init() {
				this.dataLocal = await browser.storage.local.get().then(function (storedSettings) {
					return storedSettings;
				});
				
				this.dataSync = await browser.storage.sync.get().then(function (storedSettings) {
					return storedSettings;
				});

				this.initialized = true;
			},

			getLocal(key) {
				return this.dataLocal[key];
			},

			setLocal(key, value) {
				this.dataLocal[key] = value;
				browser.storage.local.set(this.dataLocal);
			},

			getSync(key) {
				return this.dataSync[key];
			},

			setSync(key, value) {
				this.dataSync[key] = value;
				browser.storage.local.set(this.dataSync);
			}
		}
	};
	
	backloggery.storage.init();

	const observer = new MutationObserver(() => {

		if (window.location.hostname === 'backloggery.com' || window.location.hostname === 'www.backloggery.com') {
			if (window.location.pathname.endsWith('/history')) {
				backloggery.memoryCard.init();
			}
		}
	});

	observer.observe(document, { childList: true, subtree: true });
})();

function filterMemoryCard(event, backloggery){
	// Get the value from the changed dropdown
	var id = event.target.id;
	var value = event.target.value;
	switch(id){
		case "status-dropdown":
			backloggery.memoryCard.filterStatus = value;
			break;
		case "month-dropdown":
			backloggery.memoryCard.filterMonth = value;
			break;
		case "system-dropdown":
			backloggery.memoryCard.filterSystem = value;
			break;
	}

	// Grab all the filters from the backloggery object
	var status = backloggery.memoryCard.filterStatus;
	var month = backloggery.memoryCard.filterMonth;
	var system = backloggery.memoryCard.filterSystem;
	
	if (month != 'ALL')
		month = String(backloggery.memoryCard.months.indexOf(month)).padStart(2,'0');

	var date = "";

	var count = 0;

	// Loop through the entire Memory Card
	for (var i = 0; i < backloggery.memoryCard.memoryCard.length; i++){
		var memory = backloggery.memoryCard.memoryCard[i];
		var item = memory.entry;

		var showDate = false;

		// Check if item matches filter
		if ((memory.status == status || status == "ALL") &&
			(memory.month == month || month == "ALL") &&
			(memory.system == system || system == "ALL")){

			// Matches filter, display the item
			item.style.display = "";
			
			// Determine if the custom date needs to be displayed
			if (item.querySelector('.extras-date-header') != null && (memory.fullDate != date || date == "")){
				showDate = true;
			}

			date = memory.fullDate;
			count++;
		}else{
			// Does not match the filter, hide the item
			item.style.display = "none";

			date = "";
		}

		// Change the display of the custom date here		
		if (item.querySelector('.extras-date-header') != null){
			var extras = item.querySelectorAll('.extras-date-header');
			for (const extra of extras){
				if (showDate){
					extra.style.display = "";
				}else{
					extra.style.display = "none";
				}
			}
		}
	}
	// Set header title
	backloggery.memoryCard.UpdateSubHeader(count);

	// Show or hide the blank label
	if (count == 0){
		document.querySelector('.blank-label-extras').style['display'] = "";
	}else{
		document.querySelector('.blank-label-extras').style['display'] = "none";
	}
}

function ToggleFilters(event, backloggery){
	var target = event.target.getAttribute('target');

	var element = document.querySelector('.' + target);

	if (element.style.display == 'none'){
		element.style.display = '';
		backloggery.storage.setLocal('history-filter-show', 'show');
	}else{
		element.style.display = 'none';
		backloggery.storage.setLocal('history-filter-show', 'hide');
	}
}