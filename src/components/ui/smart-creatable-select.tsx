
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
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
import { toTitleCase } from "@/features/clients/utils/clientUtils"

interface SmartCreatableSelectProps {
    options: string[]
    value?: string
    onChange: (value: string) => void
    title?: string
    placeholder?: string
    icon?: React.ElementType
    className?: string
    allowCreate?: boolean
}

export function SmartCreatableSelect({
    options: initialOptions,
    value,
    onChange,
    title = "Seleccionar",
    placeholder = "Buscar...",
    icon: Icon,
    className,
    allowCreate = true,
}: SmartCreatableSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    // Combine initial options with the current value if it's not in the list
    // This ensures that if we have a value selected that is not in the default list (e.g. a custom one), it shows up
    const options = React.useMemo(() => {
        const sets = new Set(initialOptions)
        if (value && !sets.has(value)) {
            sets.add(value)
        }
        return Array.from(sets).sort()
    }, [initialOptions, value])

    const normalizedInput = toTitleCase(inputValue)

    // Check if the exact normalized input already exists in options
    const exactMatch = options.find(
        (option) => option.toLowerCase() === itemToId(inputValue)
    )

    return (
        <Popover open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen);
            // Auto-commit on close if there is input and it's not empty
            if (!newOpen && inputValue.trim()) {
                const valToSelect = exactMatch || (allowCreate ? normalizedInput : null);
                if (valToSelect && valToSelect !== value) {
                    onChange(valToSelect);
                    setInputValue("");
                }
            }
        }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between bg-[#09090b] border-white/10 text-white/90 hover:bg-white/5 hover:text-white capitalize",
                        !value && "text-white/50 font-normal",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-50" />}
                        {value ? value : title}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-white/10 bg-[#18181b] text-white">
                <Command className="bg-transparent" filter={(value, search) => {
                    const normalizedValue = value.toLowerCase();
                    const normalizedSearch = search.toLowerCase();
                    if (normalizedValue.includes(normalizedSearch)) return 1;
                    return 0;
                }}>
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

                        {allowCreate && inputValue && !exactMatch && (
                            <CommandGroup heading="Acción">
                                <CommandItem
                                    value={`create-${normalizedInput}`}
                                    onSelect={() => {
                                        onChange(normalizedInput)
                                        setOpen(false)
                                        setInputValue("")
                                    }}
                                    className="text-violet-300 hover:text-violet-200 aria-selected:bg-violet-500/10 cursor-pointer py-2 px-2 border border-dashed border-violet-500/30 rounded-md mb-2 mx-1"
                                >
                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                    Crear "{normalizedInput}"
                                </CommandItem>
                            </CommandGroup>
                        )}
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option}
                                    value={option} // cmdk uses this for filtering. It lowercases it internally usually but we handle filter manually above mostly
                                    onSelect={(currentValue) => {
                                        // cmdk might return lowercase value here, 
                                        // so we use the option text itself to be safe or find the case-insensitive match
                                        const matched = options.find(o => o.toLowerCase() === currentValue.toLowerCase())
                                        onChange(matched || option)
                                        setOpen(false)
                                    }}
                                    className="text-white hover:bg-white/10 aria-selected:bg-white/10 data-[selected=true]:bg-white/10 cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

// Helper to normalized comparison ID
function itemToId(str: string) {
    return str.toLowerCase()
}
