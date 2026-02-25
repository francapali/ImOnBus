import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { GeoLocation } from '../types';
import { geocodeSearch } from '../services/geocoding';

interface LocationInputProps {
  placeholder: string;
  value: GeoLocation | null;
  onChange: (location: GeoLocation | null) => void;
  icon?: React.ReactNode;
  className?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  placeholder,
  value,
  onChange,
  icon,
  className = '',
}) => {
  const [query, setQuery] = useState(value?.displayName || '');
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await geocodeSearch(q, 5);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(null); // clear selection when typing

    // Debounce API calls (500ms to respect Nominatim rate limits)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 500);
  };

  const handleSelect = (location: GeoLocation) => {
    setQuery(location.displayName);
    onChange(location);
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    onChange(null);
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync query with external value
  useEffect(() => {
    if (value) {
      setQuery(value.displayName);
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-3 text-slate-400">
          {icon || <MapPin className="w-5 h-5" />}
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
          autoComplete="off"
        />
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto"
        >
          {suggestions.map((loc, idx) => (
            <button
              key={`${loc.lat}-${loc.lon}-${idx}`}
              onClick={() => handleSelect(loc)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                idx === selectedIndex ? 'bg-emerald-50' : ''
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{loc.name}</p>
                <p className="text-xs text-slate-500 truncate">{loc.displayName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && suggestions.length === 0 && !isLoading && query.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center"
        >
          <p className="text-sm text-slate-500">Nessun risultato a Bari</p>
          <p className="text-xs text-slate-400 mt-1">Prova con un indirizzo diverso</p>
        </div>
      )}

      {/* Selected confirmation */}
      {value && (
        <div className="mt-1 flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-emerald-700 font-medium truncate">
            {value.lat.toFixed(5)}, {value.lon.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
};
