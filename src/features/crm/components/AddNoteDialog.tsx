"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Person } from "@/features/clients/types";
import { useCRM } from "../hooks/useCRM";
import { toast } from "sonner";

interface AddNoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    person: Person | null;
    onSuccess?: () => void;
}

export function AddNoteDialog({
    open,
    onOpenChange,
    person,
    onSuccess,
}: AddNoteDialogProps) {
    const [note, setNote] = useState("");
    const [updateLastContact, setUpdateLastContact] = useState(true);

    const { updatePerson } = useCRM();

    useEffect(() => {
        if (open) {
            setNote("");
            setUpdateLastContact(true);
        }
    }, [open, person]);

    const handleSave = async () => {
        if (!person || !note.trim()) return;

        try {
            const today = new Date().toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });

            const newEntry = `[${today}] ${note.trim()}`;
            const existingObs = person.observations || "";
            const newObservations = existingObs
                ? `${newEntry}\n\n${existingObs}`
                : newEntry;

            await updatePerson.mutateAsync({
                id: person.id,
                data: {
                    observations: newObservations,
                    lastInteractionAt: updateLastContact ? new Date().toISOString() : undefined,
                },
            });

            toast.success("Nota agregada correctamente");
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Error adding note:", error);
            // Toast error handled by mutation
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-[#09090b] border-white/10 shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] text-white">
                <DialogHeader>
                    <DialogTitle>Agregar Nota</DialogTitle>
                    {person && (
                        <DialogDescription className="text-sm text-white/50">
                            Para: <span className="text-white font-medium">{person.first_name} {person.last_name}</span>
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="note">Nueva Nota</Label>
                        <Textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Escribe los detalles aquí..."
                            className="bg-white/5 border-white/10 text-white min-h-[120px] focus:ring-violet-500/50"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="update-contact"
                            checked={updateLastContact}
                            onChange={(e) => setUpdateLastContact(e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer accent-violet-600"
                        />
                        <Label htmlFor="update-contact" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                            Actualizar fecha de último contacto
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 hover:text-white">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!note.trim() || updatePerson.isPending}
                        className="bg-violet-600 hover:bg-violet-500 text-white"
                    >
                        {updatePerson.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Nota
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
