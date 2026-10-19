let db;
let userLogoBase64 = null;
let currentDocType = 'devis'; 

const urlParams = new URLSearchParams(window.location.search);
const typeParam = urlParams.get('type');
if (typeParam === 'facture') currentDocType = 'facture';
if (typeParam === 'proforma') currentDocType = 'proforma';

window.addEventListener('DOMContentLoaded', () => {
    const title = document.getElementById('page-title');
    const saveBtn = document.getElementById('save-btn');
    const validityGroup = document.getElementById('validity-group');

    if (currentDocType === 'facture') {
        title.textContent = "Créer une Facture Officielle";
        saveBtn.innerHTML = "💾 Enregistrer la Facture";
        validityGroup.style.display = 'none'; 
        document.title = "Facture - Safeerverse QuickQuote";
    } else if (currentDocType === 'proforma') {
        title.textContent = "Créer une Facture Proforma";
        saveBtn.innerHTML = "💾 Enregistrer la Proforma";
        document.title = "Proforma - Safeerverse QuickQuote";
    }
});

const dbRequest = indexedDB.open("QuickQuoteDB", 1);
dbRequest.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
    if (!db.objectStoreNames.contains("quotes")) db.createObjectStore("quotes", { keyPath: "id", autoIncrement: true });
};
dbRequest.onsuccess = function(event) {
    db = event.target.result;
    loadSettings();
    prefillDocumentNumber(); // ملء رقم الوثيقة تلقائياً عند التحميل
};

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        userLogoBase64 = e.target.result;
        saveSettings();
    };
    reader.readAsDataURL(file);
}

let items = [{ id: Date.now(), desc: 'Prestation de service', qty: 1, price: 0 }];

function addItem() {
    items.push({ id: Date.now(), desc: '', qty: 1, price: 0 });
    renderItemsForm(); updatePreview();
}
function removeItem(id) {
    items = items.filter(item => item.id !== id);
    renderItemsForm(); updatePreview();
}
function updateItem(id, field, value) {
    const item = items.find(i => i.id === id);
    if (item) {
        item[field] = field === 'desc' ? value : parseFloat(value) || 0;
        updatePreview();
    }
}

function renderItemsForm() {
    const container = document.getElementById('items-container');
    container.innerHTML = '';
    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <input type="text" placeholder="Désignation" value="${item.desc}" oninput="updateItem(${item.id}, 'desc', this.value)">
            <input type="number" placeholder="Qté" value="${item.qty}" min="0" oninput="updateItem(${item.id}, 'qty', this.value)">
            <input type="number" placeholder="Prix HT" value="${item.price}" min="0" oninput="updateItem(${item.id}, 'price', this.value)">
            <button class="btn-remove" onclick="removeItem(${item.id})">✕</button>
        `;
        container.appendChild(row);
    });
}

function updatePreview() {
    document.getElementById('preview-client-name').textContent = document.getElementById('clientName')?.value || '-';
    const previewContainer = document.getElementById('preview-items');
    previewContainer.innerHTML = '';

    let subtotalHT = 0;
    items.forEach(item => {
        const lineTotal = item.qty * item.price;
        subtotalHT += lineTotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.desc || 'Sans nom'}</td><td>${item.qty}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(lineTotal)}</td>`;
        previewContainer.appendChild(tr);
    });

    const discountAmount = parseFloat(document.getElementById('discountAmount')?.value) || 0;
    const netHT = Math.max(0, subtotalHT - discountAmount);
    const tvaRate = parseFloat(document.getElementById('tvaRate')?.value) || 0;
    const tvaAmount = netHT * (tvaRate / 100);
    const totalTTC = netHT + tvaAmount;

    document.getElementById('subtotal').textContent = formatCurrency(subtotalHT);
    document.getElementById('tax').textContent = formatCurrency(tvaAmount);
    document.getElementById('grand-total').textContent = formatCurrency(totalTTC);
}

function formatCurrency(amount) {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' });
}

function saveSettings() {
    if (!db) return;
    const settings = {
        senderName: document.getElementById('senderName')?.value || '',
        senderEmail: document.getElementById('senderEmail')?.value || '',
        senderPhone: document.getElementById('senderPhone')?.value || '',
        senderAddress: document.getElementById('senderAddress')?.value || '',
        senderNif: document.getElementById('senderNif')?.value || '',
        senderRc: document.getElementById('senderRc')?.value || '',
        senderNis: document.getElementById('senderNis')?.value || '',
        senderAi: document.getElementById('senderAi')?.value || '',
        senderBank: document.getElementById('senderBank')?.value || '',
        logo: userLogoBase64
    };
    db.transaction(["settings"], "readwrite").objectStore("settings").put(settings, "userProfile");
}

function loadSettings() {
    if (!db) return;
    const request = db.transaction(["settings"], "readonly").objectStore("settings").get("userProfile");
    request.onsuccess = function() {
        if (request.result) {
            const r = request.result;
            if(document.getElementById('senderName')) document.getElementById('senderName').value = r.senderName || '';
            if(document.getElementById('senderEmail')) document.getElementById('senderEmail').value = r.senderEmail || '';
            if(document.getElementById('senderPhone')) document.getElementById('senderPhone').value = r.senderPhone || '';
            if(document.getElementById('senderAddress')) document.getElementById('senderAddress').value = r.senderAddress || '';
            if(document.getElementById('senderNif')) document.getElementById('senderNif').value = r.senderNif || '';
            if(document.getElementById('senderRc')) document.getElementById('senderRc').value = r.senderRc || '';
            if(document.getElementById('senderNis')) document.getElementById('senderNis').value = r.senderNis || '';
            if(document.getElementById('senderAi')) document.getElementById('senderAi').value = r.senderAi || '';
            if(document.getElementById('senderBank')) document.getElementById('senderBank').value = r.senderBank || '';
            if (r.logo) userLogoBase64 = r.logo;
        }
    };
}

function generateDocumentNumber(type, callback) {
    const currentYear = new Date().getFullYear();
    const transaction = db.transaction(["quotes"], "readonly");
    const request = transaction.objectStore("quotes").getAll();

    request.onsuccess = function() {
        const docs = request.result;
        let maxNumber = 0;
        
        docs.forEach(d => {
            if (d.docType === type && d.number) {
                let num = 0;
                if (type === 'facture') {
                    const parts = d.number.split('/');
                    if (parts.length === 2 && parts[0] === currentYear.toString()) num = parseInt(parts[1], 10);
                } else {
                    const parts = d.number.split('-');
                    if (parts.length === 2) num = parseInt(parts[1].split('/')[0], 10);
                }
                if (num > maxNumber) maxNumber = num;
            }
        });

        const nextNum = String(maxNumber + 1).padStart(3, '0');
        let finalNumber = "";
        
        if (type === 'facture') finalNumber = `${currentYear}/${nextNum}`;
        else if (type === 'proforma') finalNumber = `PROFORMA-${nextNum}/${currentYear}`;
        else finalNumber = `DEVIS-${nextNum}/${currentYear}`;
        
        callback(finalNumber);
    };
}

function prefillDocumentNumber() {
    generateDocumentNumber(currentDocType, function(num) {
        const input = document.getElementById('docNumber');
        if (input && input.value === '') {
            input.value = num;
        }
    });
}

function saveDocument() {
    if (!db) return;
    
    const manualNumber = document.getElementById('docNumber').value.trim();
    if (!manualNumber) {
        alert("⚠️ Veuillez saisir un numéro de document.");
        return;
    }

    // التحقق من عدم وجود الرقم مسبقاً
    db.transaction(["quotes"], "readonly").objectStore("quotes").getAll().onsuccess = function(e) {
        const exists = e.target.result.some(d => d.number === manualNumber);
        if (exists) {
            if (!confirm(`⚠️ ATTENTION : Le numéro "${manualNumber}" existe déjà dans votre historique. L'utiliser à nouveau peut causer des problèmes comptables. Continuer quand même ?`)) {
                return;
            }
        }
        proceedToSave(manualNumber);
    };
}

function proceedToSave(manualNumber) {
    const subtotalHT = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discountAmount = parseFloat(document.getElementById('discountAmount')?.value) || 0;
    const tvaRate = parseFloat(document.getElementById('tvaRate')?.value) || 0;
    const netHT = Math.max(0, subtotalHT - discountAmount);
    const tvaAmount = netHT * (tvaRate / 100);
    const totalTTC = netHT + tvaAmount;

    const quoteData = {
        docType: currentDocType,
        number: manualNumber,
        clientName: document.getElementById('clientName')?.value || '',
        clientAddress: document.getElementById('clientAddress')?.value || '',
        clientNif: document.getElementById('clientNif')?.value || '',
        clientRc: document.getElementById('clientRc')?.value || '',
        validityDays: document.getElementById('validityDays')?.value || 30,
        paymentTerms: document.getElementById('paymentTerms')?.value || '',
        items: items,
        subtotalHT: subtotalHT,
        discount: discountAmount,
        tvaRate: tvaRate,
        tvaAmount: tvaAmount,
        totalTTC: totalTTC,
        date: new Date().toISOString()
    };
    
    const request = db.transaction(["quotes"], "readwrite").objectStore("quotes").add(quoteData);
    request.onsuccess = function() { 
        alert(`✅ Document ${manualNumber} enregistré avec succès !`); 
        document.getElementById('clientName').value = '';
        document.getElementById('clientAddress').value = '';
        document.getElementById('clientNif').value = '';
        document.getElementById('clientRc').value = '';
        items = [{ id: Date.now(), desc: 'Prestation de service', qty: 1, price: 0 }];
        renderItemsForm(); updatePreview();
        // إعادة توليد الرقم للوثيقة التالية
        document.getElementById('docNumber').value = '';
        prefillDocumentNumber();
    };
}

function numberToFrenchWords(n) {
    if (n === 0) return "zéro";
    const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
    function convertGroup(num) {
        let res = "";
        if (num >= 100) { const h = Math.floor(num / 100); res += (h === 1 ? "cent " : units[h] + " cent "); num %= 100; }
        if (num >= 10 && num < 20) res += teens[num - 10] + " ";
        else if (num >= 20) {
            const t = Math.floor(num / 10); const u = num % 10;
            res += tens[t];
            if (u === 1 && t !== 8 && t !== 9) res += "-et-un ";
            else if (u > 0) res += "-" + units[u] + " ";
            else res += " ";
        } else if (num > 0) res += units[num] + " ";
        return res;
    }
    let intPart = Math.floor(n); let centPart = Math.round((n - intPart) * 100); let words = "";
    if (intPart >= 1000000) { words += convertGroup(Math.floor(intPart / 1000000)) + "million(s) "; intPart %= 1000000; }
    if (intPart >= 1000) { const thousands = Math.floor(intPart / 1000); words += (thousands === 1 ? "mille " : convertGroup(thousands) + "mille "); intPart %= 1000; }
    words += convertGroup(intPart);
    words = words.trim();
    if (centPart > 0) words += " dinars et " + convertGroup(centPart).trim() + " centimes";
    else words += " dinars";
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const currentNumber = document.getElementById('docNumber').value.trim() || 'NON_DEFINI';

    const sender = {
        name: document.getElementById('senderName')?.value || '',
        email: document.getElementById('senderEmail')?.value || '',
        phone: document.getElementById('senderPhone')?.value || '',
        address: document.getElementById('senderAddress')?.value || '',
        nif: document.getElementById('senderNif')?.value || '',
        rc: document.getElementById('senderRc')?.value || '',
        nis: document.getElementById('senderNis')?.value || '',
        ai: document.getElementById('senderAi')?.value || '',
        bank: document.getElementById('senderBank')?.value || ''
    };

    const client = {
        name: document.getElementById('clientName')?.value || '',
        address: document.getElementById('clientAddress')?.value || '',
        nif: document.getElementById('clientNif')?.value || '',
        rc: document.getElementById('clientRc')?.value || ''
    };

    const subtotalHT = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discountAmount = parseFloat(document.getElementById('discountAmount')?.value) || 0;
    const netHT = Math.max(0, subtotalHT - discountAmount);
    const tvaRate = parseFloat(document.getElementById('tvaRate')?.value) || 0;
    const tvaAmount = netHT * (tvaRate / 100);
    const totalTTC = netHT + tvaAmount;
    const validityDays = document.getElementById('validityDays')?.value || 30;
    const paymentTerms = document.getElementById('paymentTerms')?.value || '';

    function fmt(num) { return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " DA"; }

    if (userLogoBase64) doc.addImage(userLogoBase64, 'PNG', 14, 10, 30, 30); 
    
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    let titleText = currentDocType === 'facture' ? "FACTURE" : (currentDocType === 'proforma' ? "FACTURE PROFORMA" : "DEVIS");
    doc.text(titleText, 196, 20, { align: "right" });
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`N° : ${currentNumber}`, 196, 27, { align: "right" });
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 196, 32, { align: "right" });

    if (currentDocType !== 'facture') {
        doc.text(`Validité : ${validityDays} jours`, 196, 37, { align: "right" });
    }

    doc.setFontSize(11); doc.setTextColor(0); doc.setFont("helvetica", "bold");
    doc.text(sender.name.toUpperCase(), 14, 55);
    
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    let y = 60;
    if(sender.address) { doc.text(sender.address, 14, y); y += 4; }
    
    let senderInfo = [];
    if(sender.phone) senderInfo.push(`Tél: ${sender.phone}`);
    if(sender.email) senderInfo.push(`Email: ${sender.email}`);
    if(senderInfo.length > 0) { doc.text(senderInfo.join(" | "), 14, y); y += 4; }

    let legalInfo = [];
    if(sender.rc) legalInfo.push(`RC: ${sender.rc}`);
    if(sender.nif) legalInfo.push(`NIF: ${sender.nif}`);
    if(sender.nis) legalInfo.push(`NIS: ${sender.nis}`);
    if(sender.ai) legalInfo.push(`AI: ${sender.ai}`);
    if(legalInfo.length > 0) { doc.text(legalInfo.join(" | "), 14, y); y += 4; }

    if(sender.bank) { doc.text(`Compte: ${sender.bank}`, 14, y); y += 4; }

    let cy = 55;
    doc.setFontSize(10); doc.setTextColor(100); doc.text("DOIT / CLIENT :", 120, cy - 5);
    
    doc.setTextColor(0); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(client.name.toUpperCase(), 120, cy);
    
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    cy += 5;
    if(client.address) { doc.text(client.address, 120, cy); cy += 4; }
    
    let clientLegal = [];
    if(client.rc) clientLegal.push(`RC: ${client.rc}`);
    if(client.nif) clientLegal.push(`NIF: ${client.nif}`);
    if(clientLegal.length > 0) { doc.text(clientLegal.join(" | "), 120, cy); cy += 4; }

    const tableData = items.map(item => [
        item.desc || 'Sans nom', item.qty.toString(), fmt(item.price), fmt(item.qty * item.price)
    ]);

    let startTableY = Math.max(y, cy) + 10;

    doc.autoTable({
        startY: startTableY,
        head: [['Désignation', 'Qté', 'P.U HT', 'Total HT']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9, textColor: [0,0,0], lineColor: [200, 200, 200], lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    let finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("Total HT", 140, finalY); doc.text(fmt(subtotalHT), 196, finalY, { align: "right" });
    
    if (discountAmount > 0) {
        finalY += 5; doc.text("Remise", 140, finalY); doc.text(`- ${fmt(discountAmount)}`, 196, finalY, { align: "right" });
    }
    
    finalY += 5; doc.text(`TVA (${tvaRate}%)`, 140, finalY); doc.text(fmt(tvaAmount), 196, finalY, { align: "right" });

    finalY += 3; doc.setDrawColor(200); doc.setLineWidth(0.5); doc.line(140, finalY, 196, finalY);

    finalY += 6; doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("TOTAL TTC", 140, finalY); doc.text(fmt(totalTTC), 196, finalY, { align: "right" });

    finalY += 15;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(`Conditions de paiement : ${paymentTerms}`, 14, finalY);
    
    if (currentDocType === 'facture') {
        finalY += 6;
        doc.setFont("helvetica", "italic");
        const words = numberToFrenchWords(totalTTC);
        const splitTitle = doc.splitTextToSize(`Arrêtée la présente facture à la somme de : ${words}`, 180);
        doc.text(splitTitle, 14, finalY);
    }

    doc.save(`${titleText.replace(' ', '_')}_${currentNumber.replace('/', '-')}.pdf`);
}

window.onload = () => {
    renderItemsForm(); updatePreview();
};