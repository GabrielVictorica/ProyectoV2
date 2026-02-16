import * as React from "react"
import { Check, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"

interface FacetedFilterProps {
    title?: string
    options: {
        label: string
        value: string
        icon?: React.ComponentType<{ className?: string }>
    }[]
    selectedValues: string[]
    onSelect: (values: string[]) => void
}

export function FacetedFilter({
    title,
    options,
    selectedValues,
    onSelect,
}: FacetedFilterProps) {
    const selected = new Set(selectedValues)

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed bg-transparent border-white/20 text-white/70 hover:text-white hover:bg-white/5">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {title}
                    {selected.size > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4 bg-white/10" />
                            <Badge
                                variant="secondary"
                                className="rounded-sm px-1 font-normal lg:hidden bg-white/10 text-white"
                            >
                                {selected.size}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {selected.size > 2 ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm px-1 font-normal bg-white/10 text-white"
                                    >
                                        {selected.size} seleccionados
                                    </Badge>
                                ) : (
                                    options
                                        .filter((option) => selected.has(option.value))
                                        .map((option) => (
                                            <Badge
                                                key={option.value}
                                                variant="secondary"
                                                className="rounded-sm px-1 font-normal bg-white/10 text-white"
                                            >
                                                {option.label}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-[#09090b] border-white/10 text-white" align="start">
                <Command className="bg-transparent">
                    <CommandInput placeholder={title} className="text-white placeholder:text-white/30" />
                    <CommandList>
                        <CommandEmpty>No hay resultados.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selected.has(option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            if (isSelected) {
                                                selected.delete(option.value)
                                            } else {
                                                selected.add(option.value)
                                            }
                                            onSelect(Array.from(selected))
                                        }}
                                        className="aria-selected:bg-white/5 aria-selected:text-white"
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-white/30",
                                                isSelected
                                                    ? "bg-violet-600 border-violet-600 text-white"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        {option.icon && (
                                            <option.icon className="mr-2 h-4 w-4 text-white/50" />
                                        )}
                                        <span>{option.label}</span>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        {selected.size > 0 && (
                            <>
                                <CommandSeparator className="bg-white/10" />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => onSelect([])}
                                        className="justify-center text-center aria-selected:bg-white/5 aria-selected:text-white"
                                    >
                                        Limpiar filtros
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
