"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { toTitleCase } from "@/features/clients/utils/clientUtils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type MultiSelectOptionGroup = {
    label: string
    options: string[]
}

interface SmartMultiSelectProps {
    groups: MultiSelectOptionGroup[]
    selected: string[]
    onChange: (value: string[]) => void
    title?: string
    placeholder?: string
    icon?: React.ElementType
    className?: string
}

export function SmartMultiSelect({
    groups,
    selected,
    onChange,
    title = "Seleccionar",
    placeholder = "Buscar...",
    icon: Icon,
    className,
}: SmartMultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    const handleSelect = (option: string) => {
        const isSelected = selected.includes(option)
        if (isSelected) {
            onChange(selected.filter(item => item !== option))
        } else {
            onChange([...selected, option])
        }
    }

    const handleCreate = () => {
        if (inputValue.trim()) {
            const normalized = toTitleCase(inputValue.trim())
            // Case-insensitive check against existing selected items
            const alreadySelected = selected.some(s => s.toLowerCase() === normalized.toLowerCase())

            if (!alreadySelected) {
                onChange([...selected, normalized])
            }
            setInputValue("")
        }
    }

    // Flatten options for checking existence
    const allOptions = React.useMemo(() => {
        return groups.flatMap(g => g.options);
    }, [groups]);

    const exactMatch = allOptions.some(opt => opt.toLowerCase() === inputValue.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between bg-[#09090b] border-white/10 text-white/90 hover:bg-white/5 hover:text-white h-auto py-2",
                        selected.length === 0 && "text-white/50 font-normal",
                        className
                    )}
                >
                    <div className="flex flex-wrap items-center gap-1.5 text-left">
                        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-50 mr-1" />}
                        {selected.length > 0 ? (
                            selected.map((item) => (
                                <Badge
                                    key={item}
                                    variant="secondary"
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/10 text-[10px] px-1.5 h-5 flex items-center gap-1"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleSelect(item)
                                    }}
                                >
                                    {item}
                                    <X className="h-3 w-3 opacity-50 hover:opacity-100" />
                                </Badge>
                            ))
                        ) : (
                            <span>{title}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-white/10 bg-[#18181b] text-white">
                <Command className="bg-transparent">
                    <CommandInput
                        placeholder={placeholder}
                        className="text-white placeholder:text-white/30 border-b-white/10"
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-2 text-sm text-white/50">
                            No se encontraron resultados.
                        </CommandEmpty>

                        {inputValue && !exactMatch && (
                            <CommandGroup heading="Acción">
                                <CommandItem
                                    value={`create-${inputValue}`}
                                    onSelect={handleCreate}
                                    className="text-violet-300 hover:text-violet-200 aria-selected:bg-violet-500/10 cursor-pointer py-2 px-2 border border-dashed border-violet-500/30 rounded-md mb-2 mx-1"
                                >
                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                    Crear "{inputValue}"
                                </CommandItem>
                            </CommandGroup>
                        )}

                        {groups.map((group) => (
                            <CommandGroup key={group.label} heading={group.label} className="text-white/70">
                                {group.options.map((option) => (
                                    <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={() => handleSelect(option)}
                                        className="text-white hover:bg-white/10 aria-selected:bg-white/10 cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selected.includes(option) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
