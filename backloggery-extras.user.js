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
	`);
	/* eslint-enable */

	const backloggery = {

		memoryCard: {

			lastLocation: window.location.pathname,

			memoryCard: null,
			months: ["ALL","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
			statuses: ["ALL","Added","Added (Unfinished)","Added (Beat)","Added (Completed)","Started","Beat","Completed","Endless","None"],
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

				this.running = true;

				const history = document.querySelector('section.history')

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
						// Create the Section
						const container = backloggery.helpers.createElement('div', {
							class: 'filter-extras'
						});
						const header = backloggery.helpers.createElement('h1', {
							class: 'header-extras'
						});
						header.innerText = "Filters - " + this.memoryCard.length + " shown";
						container.append(header);

						// Create the dropdown UIs
						this.CreateDropDown(container, "status-dropdown", "Status: ", this.statuses);
						this.CreateDropDown(container, "month-dropdown", "Month: ", this.months);
						this.CreateDropDown(container, "system-dropdown", "System: ", this.systems);

						// Add to the page
						document.querySelector(".history-extras p").append(container);

						// Add on change event for the dropdowns to trigger the filter function
						$(".extras-dropdown").on('change', function(event){
							filterMemoryCard(event, backloggery);
						});
					}
					else{
						// Update the existing filers
						this.SelectDownDown('status-dropdown', 'ALL');
						this.SelectDownDown('month-dropdown', 'ALL');
						this.SelectDownDown('system-dropdown', 'ALL');

						this.UpdateDropDown('system-dropdown', this.systems);

						document.querySelector('.header-extras').innerText = "Filters - " + this.memoryCard.length + " shown";
					}
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
		}
	};

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
	document.querySelector('.header-extras').innerText = "Filters - " + count + " shown";

	// Show or hide the blank label
	if (count == 0){
		document.querySelector('.blank-label-extras').style['display'] = "";
	}else{
		document.querySelector('.blank-label-extras').style['display'] = "none";
	}
}