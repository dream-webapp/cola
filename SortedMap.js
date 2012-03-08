/** MIT License (c) copyright B Cavalier & J Hann */

(function (define) {
define(function () {

	var undef, missing = {};

	/**
	 * @constructor
	 * @param symbolizer {Function}
	 * @param comparator {Function}
	 */
	function SortedMap (symbolizer, comparator) {

		// symbolizer is required, comparator is optional

		// hashmap of object-object pairs
		this._index = {};

		// 2d array of objects
		this._sorted = [];

		/**
		 * Fetches a value item for the given key item or the special object,
		 * missing, if the value item was not found.
		 * @private
		 * @param keyItem
		 * @returns {Object} the value item that was set for the supplied
		 * key item or the special object, missing, if it was not found.
		 */
		this._fetch = function (keyItem) {
			var symbol = symbolizer(keyItem);
			return symbol in this._index ? this._index[symbol] : missing;
		};

		/**
		 * Performs a binary search to find the insertion position of a
		 * key item within the key items list.  Only used if we have a
		 * comparator.
		 * @private
		 * @param keyItem
		 * @param exactMatch {Boolean} if true, must be an exact match to the key
		 *   item, not just the correct position for a key item that sorts
		 *   the same.
		 * @returns {Number|Undefined}
		 */
		this._pos = function (keyItem, exactMatch) {
			var pos, sorted;
			sorted = this._sorted;
			function getKey (pos) { return sorted[pos] ? sorted[pos][0].key : {}; }
			pos = binarySearch(0, sorted.length, keyItem, getKey, comparator);
			if (exactMatch) {
				if (symbolizer(keyItem) != symbolizer(sorted[pos][0].key)) {
					pos = -1;
				}
			}
			return pos;
		};
		if (!comparator) {
			this._pos = function (keyItem, exact) {
				return exact ? -1 : this._sorted.length;
			};
		}

		/**
		 * Given a keyItem and its position in the list of key items,
		 * inserts an value item into the list of value items.
		 * This method can be overridden by other objects that need to
		 * have objects in the same order as the key values.
		 * @private
		 * @param valueItem
		 * @param keyItem
		 * @param pos
		 * @returns {Number} the position in the sorted list.
		 */
		this._insert = function (keyItem, pos, valueItem) {
			var pair, symbol, entry;

			// insert into index
			pair = { key: keyItem, value: valueItem };
			symbol = symbolizer(keyItem);
			this._index[symbol] = pair;

			// insert into sorted table
			if (pos >= 0) {
				entry = this._sorted[pos] && this._sorted[pos][0];
				// is this a new row (at end of array)?
				if (!entry) {
					this._sorted[pos] = [pair];
				}
				// are there already items of the same sort position here?
				else if (comparator(entry.key, keyItem) == 0) {
					this._sorted[pos].push(pair);
				}
				// or do we need to insert a new row?
				else {
					this._sorted.splice(pos, 0, [pair]);
				}
			}

			return pos;
		};

		/**
		 * Given a key item and its position in the list of key items,
		 * removes a value item from the list of value items.
		 * This method can be overridden by other objects that need to
		 * have objects in the same order as the key values.
		 * @private
		 * @param keyItem
		 * @param pos
		 * @returns {Number} the position in the sorted list.
		 */
		this._remove = function remove (keyItem, pos) {
			var symbol, entries, i, entry;

			symbol = symbolizer(keyItem);

			// delete from index
			delete this._index[symbol];

			// delete from sorted table
			entries = this._sorted[pos] || [];
			i = entries.length;
			// find it and remove it
			while ((entry = entries[--i])) {
				if (symbolizer(entry.key)) {
					entries.splice(i, 1);
					break;
				}
			}
			// if we removed all pairs at this position
			if (entries.length == 0) {
				this._sorted.splice(pos, 1);
			}

			return pos;
		};

	}

	SortedMap.prototype = {

		get: function (keyItem) {
			var valueItem;
			valueItem = this._fetch(keyItem);
			return valueItem == missing ? undef : valueItem;
		},

		add: function (keyItem, valueItem) {
			var pos;

			// don't insert twice. bail if we already have it
			if (this._fetch(keyItem) != missing) return;

			// find pos and insert
			pos = this._pos(keyItem);
			this._insert(keyItem, pos, valueItem);

			return pos;
		},

		remove: function (keyItem) {
			var valueItem, pos;

			// don't remove if we don't already have it
			valueItem = this._fetch(keyItem);
			if (valueItem == missing) return;

			// find positions and delete
			pos = this._pos(keyItem, true);
			this._remove(keyItem, pos);

			return pos;
		},

		forEach: function (lambda) {
			var i, j, len, len2, entries;

			for (i = 0, len = this._sorted.length; i < len; i++) {
				entries = this._sorted[i];
				for (j = 0, len2 = entries.length; j < len2; j++) {
					lambda(entries[j].value, entries[j].key);
				}
			}
		}

	};


	return SortedMap;

	/**
	 * Searches through a list of items, looking for the correct slot
	 * for a new item to be added.
	 * @param min {Number} points at the first possible slot
	 * @param max {Number} points at the slot after the last possible slot
	 * @param item anything comparable via < and >
	 * @param getter {Function} a function to retrieve a item at a specific
	 * 	 slot: function (pos) { return items[pos]; }
	 * @param comparator {Function} function to compare to items. must return
	 *   a number.
	 * @returns {Number} returns the slot where the item should be placed
	 *   into the list.
	 */
	function binarySearch (min, max, item, getter, comparator) {
		var mid, compare;
		if (max <= min) return min;
		do {
			mid = Math.floor((min + max) / 2);
			compare = comparator(item, getter(mid));
			if (isNaN(compare)) throw new Error('SortedMap: invalid comparator result ' + compare);
			// if we've narrowed down to a choice of just two slots
			if (max - min <= 1) {
				return compare == 0 ? mid : compare > 0 ? max : min;
			}
			// don't use mid +/- 1 or we may miss in-between values
			if (compare > 0) min = mid;
			else if (compare < 0) max = mid;
			else return mid;
		}
 		while (true);
	}

});
}(
	typeof define == 'function'
		? define
		: function (factory) { module.exports = factory(require); }
));
