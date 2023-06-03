/* global GM_xmlhttpRequest */
// ==UserScript==
// @name         Letterboxd Extras
// @namespace    https://github.com/duncanlang
// @version      1.0.0
// @description  Adds a few additional features to Letterboxd.
// @author       Duncan Lang
// @match        https://letterboxd.com/*
// @connect      https://www.imdb.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==


// setTimeout(function(){ debugger; }, 5000);  - used to freeze the inspector

(function() { // eslint-disable-line wrap-iife

	'use strict'; // eslint-disable-line strict
	
	/* eslint-disable */
	GM_addStyle(`
		.filter-extras{
			position: revert !important;
			width: auto !important;
		}
		.blank-label-extras{
			cursor: default;
		}
	`);
	/* eslint-enable */

	const backloggery = {

		memoryCard: {

			lastLocation: window.location.pathname,

			memoryCard: null,
			years: new Array(),
			months: ["ALL","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"],
			systems: new Array(),

			// Filters
			filterStatus: "ALL",
			filterYear: "ALL",
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

				// First loop through all the items and create the array 
				if (document.querySelector("#item0") != null && this.memoryCard == null && document.querySelector(".filter-extras") == null && document.querySelector("section.breakdown") != null){
					var items = $('[id^=item]');

					// Init
					this.memoryCard = new Array();
					this.years.push("ALL");
					var date = "";

					// Loop
					for (var i = 0; i < items.length; i++){
						var item = items[i];
						var text = item.querySelectorAll('b');

						// Grab the status/system and the date if it exists
						if (text[0].querySelector('u') != null){
							date = text[0].querySelector('u').innerText;
							var status = text[1].innerText;
						}else{
							var status = text[0].innerText;
						}
						status = status.replace(':','');
						
						// Make year 4 digit and add to array
						var year = "20" + date.substring(6,8);
						if (!this.years.includes(year))
							this.years.push(year);

						// Use Regex to get the system from the text
						// Specifically grabs the last group of text in parentheses
						var system = item.innerText.match(/(\()([\w\d]+)(\))(?!.*\1)/);
						system = system[2];

						if (!this.systems.includes(system))
							this.systems.push(system);

						// Create the object for the memorycard array
						var newItem = {
							id: i,
							fullDate: date,
							year: year,
							month: date.substring(0,2),
							day: date.substring(3,5),
							status: status, // New, New (Null), New (Beat), New (Complete), Started, Beat, Complete, Mastered
							system: system
						};
						this.memoryCard.push(newItem);


						// For the entries with no date, create a hidden date - to used when some filters are active
						if (text[0].querySelector('u') == null){
							const br1 = backloggery.helpers.createElement('br', {class: 'br-extras'},{display: 'none'});
							item.querySelector('img').before(br1);
							
							const b = backloggery.helpers.createElement('b', {class: 'br-extras'},{display: 'none'});
							const u = backloggery.helpers.createElement('u', {class: 'br-extras'});
							u.innerText = date;
							b.append(u);
							br1.after(b);

							const br2 = backloggery.helpers.createElement('br', {class: 'br-extras'},{display: 'none'});
							b.after(br2);
						}
					}					

					// Create the blank label
					var parent = document.querySelector("#item0").parentNode;
					var blankLabel = backloggery.helpers.createElement('label', {class: 'blank-label-extras'},{display: 'none'});
					blankLabel.innerText = "There are no results for the selected filters.";
					parent.prepend(blankLabel);

					// Adjust the top margin of the year breakdowns, depending on whether signed in or not
					var sidebarMargin = 95;
					if (document.querySelector('form').innerHTML.includes('Made a mistake? You can remove checked entries from your Memory Card with this button:'))
						sidebarMargin = 155;
					document.querySelector('section.breakdown').style["margin-top"] = sidebarMargin.toString() + "px";

					this.minHeight = document.querySelector('section.breakdown').clientHeight + sidebarMargin + 80;

				}
				
				// Now that everything has been grabbed, lets create the UI
				if (this.memoryCard != null && document.querySelector(".filter-extras") == null){
					// Sort systems array
					this.systems.sort((a, b) => a.localeCompare(b));
					this.systems.unshift("ALL");

					// Create the Section
					const container = backloggery.helpers.createElement('section', {
						class: 'breakdown filter-extras'
					});
					const header = backloggery.helpers.createElement('h1', {
						class: 'spoot header-extras'
					});
					header.innerText = "Filters - " + this.memoryCard.length + " shown";
					container.append(header);
					document.querySelector("#item0").parentNode.before(container);

					// Create the dropdown UIs
					this.CreateDropDown(container, "status-dropdown", "Status: ", ["ALL","New","New (Null)","New (Beat)","New (Complete)","Started","Beat","Completed","Mastered"]);
					this.CreateDropDown(container, "year-dropdown", "Year: ", this.years);
					this.CreateDropDown(container, "month-dropdown", "Month: ", this.months);
					this.CreateDropDown(container, "system-dropdown", "System: ", this.systems);

					// Add on change event for the dropdowns to trigger the filter function
					$(".extras-dropdown").on('change', function(event){
						filterMemoryCard(event, backloggery);
					});
				}

				// Stop
				return this.stopRunning();
			},

			CreateDropDown(parent, id, text, values){
				var select = document.createElement("select");
				select.name = id;
				select.id = id;
				select.className = "extras-dropdown";
				//select.multiple = true;
			 
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
			 
				parent.appendChild(label).appendChild(select);
			},

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
			if (window.location.pathname.startsWith('/memorycard.php')) {
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
		case "year-dropdown":
			backloggery.memoryCard.filterYear = value;
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
	var year = backloggery.memoryCard.filterYear;
	var month = backloggery.memoryCard.filterMonth;
	var system = backloggery.memoryCard.filterSystem;
	
	if (month != 'ALL')
		month = String(backloggery.memoryCard.months.indexOf(month)).padStart(2,'0');

	var date = "";

	var count = 0;

	// Loop through the entire Memory Card
	for (var i = 0; i < backloggery.memoryCard.memoryCard.length; i++){
		var memory = backloggery.memoryCard.memoryCard[i];
		var item = document.querySelector('#item' + i);
		var check = document.querySelector('#check' + i);

		var showDate = false;

		// Check if item matches filter
		if ((memory.status == status || status == "ALL") &&
			(memory.year == year || year == "ALL") &&
			(memory.month == month || month == "ALL") &&
			(memory.system == system || system == "ALL")){
			// Matches filter, display the item
			if (check != null)
				check.style.display = "inline-block";
			item.style.display = "inline-block";
			item.nextSibling.style.display = "inline-block";
			
			// Determine if the custom date needs to be displayed
			if (item.querySelector('.br-extras') != null && (memory.fullDate != date || date == "")){
				showDate = true;
			}

			date = memory.fullDate;
			count++;
		}else{
			// Does not match the filter, hide the item
			if (check != null)
				check.style.display = "none";
			item.style.display = "none";
			item.nextSibling.style.display = "none";

			date = "";
		}

		// Change the display of the custom date here		
		if (item.querySelector('.br-extras') != null){
			var extras = item.querySelectorAll('.br-extras');
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

	// Set minimum height for the section
	var section = document.querySelector('#content-wide section');
	section.style['height'] = "auto";
	if ($(section).height() <= backloggery.memoryCard.minHeight){
		section.style['height'] = backloggery.memoryCard.minHeight.toString() + "px";
	}

	// Show or hide the blank label
	if (count == 0){
		document.querySelector('.blank-label-extras').style['display'] = "";
	}else{
		document.querySelector('.blank-label-extras').style['display'] = "none";
	}
}