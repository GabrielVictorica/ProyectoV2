'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartTagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
    suggestions?: string[];
}

export function SmartTagInput({ value, onChange, placeholder = "Agregar etiqueta...", className, suggestions = [] }: SmartTagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const sanitizeTag = (tag: string): string => {
        return tag
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Eliminar tildes
            .replace(/[^a-zA-Z0-9\s]/g, "") // Mantener solo letras, números y espacios
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const addTag = (tag: string) => {
        const sanitized = sanitizeTag(tag);
        if (sanitized && !value.includes(sanitized)) {
            onChange([...value, sanitized]);
        }
        setInputValue('');
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {value.map((tag) => (
                    <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-violet-500/10 border-violet-500/20 text-violet-300 gap-1 pl-2 pr-1 py-0.5 hover:bg-violet-500/20 group transition-all"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-violet-500/50 hover:text-violet-400 p-0.5 rounded-full hover:bg-violet-500/10 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <div className="relative">
                <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : ""}
                    className="pl-9 bg-slate-900/50 border-slate-800 focus:border-violet-500/50 text-white placeholder:text-slate-600 rounded-xl"
                />
            </div>

            {inputValue.length > 0 && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-[10px] text-slate-500 w-full mb-1">Sugerencias:</span>
                    {suggestions
                        .filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s))
                        .slice(0, 5)
                        .map(suggestion => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => addTag(suggestion)}
                                className="text-[10px] bg-slate-800/50 text-slate-400 px-2 py-0.5 rounded-full hover:bg-violet-500/20 hover:text-violet-300 border border-slate-700/50 transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))
                    }
                </div>
            )}
        </div>
    );
}
