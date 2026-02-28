const AUTHORIZED_USERS = {
    godRole: true,
    byName: [
        { firstName: 'Analia', lastName: 'Muñoz' },
        { firstName: 'Jorge', lastName: 'Lagos' },
    ],
};

function hasCompetitionAccess(user) {
    if (user.role === 'god') return true;

    if (!user.firstName || !user.lastName) return false; // ADDED SAFEGUARD

    return AUTHORIZED_USERS.byName.some(
        (auth) =>
            auth.firstName.toLowerCase() === user.firstName.toLowerCase() &&
            auth.lastName.toLowerCase() === user.lastName.toLowerCase()
    );
}

console.log("God role (no name):", hasCompetitionAccess({ role: 'god' }));
console.log("God role (undefined name):", hasCompetitionAccess({ role: 'god', firstName: undefined, lastName: undefined }));
console.log("Analia Muñoz:", hasCompetitionAccess({ role: 'child', firstName: 'Analia', lastName: 'Muñoz' }));
console.log("Jorge Lagos:", hasCompetitionAccess({ role: 'child', firstName: 'jorge', lastName: 'LAGOS' }));
console.log("Random User:", hasCompetitionAccess({ role: 'child', firstName: 'Juan', lastName: 'Perez' }));
console.log("Incomplete Name:", hasCompetitionAccess({ role: 'child', firstName: 'Analia' }));
