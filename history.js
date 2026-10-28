let db;
const dbRequest = indexedDB.open("QuickQuoteDB", 1);

dbRequest.onsuccess = function(event) {
    db = event.target.result;
    loadHistory();
};

function loadHistory() {
    if (!db) return;
    const transaction = db.transaction(["quotes"], "readonly");
    const request = transaction.objectStore("quotes").getAll();

    request.onsuccess = function() {
        const docs = request.result;
        const container = document.getElementById('history-list');
        const noQuotesMsg = document.getElementById('no-quotes');
        
        container.innerHTML = '';

        if (docs.length === 0) {
            noQuotesMsg.style.display = 'block';
            return;
        }

        noQuotesMsg.style.display = 'none';
        docs.sort((a, b) => new Date(b.date) - new Date(a.date));

        docs.forEach(doc => {
            const dateStr = new Date(doc.date).toLocaleDateString('fr-FR');
            const isFacture = doc.docType === 'facture';
            const isProforma = doc.docType === 'proforma';
            
            let barClass = 'bar-devis';
            let badgeColor = 'var(--accent-gold)';
            let badgeText = 'DEVIS';
            
            if (isFacture) { 
                barClass = 'bar-facture'; 
                badgeColor = 'var(--primary-purple)'; 
                badgeText = 'FACTURE'; 
            }
            if (isProforma) { 
                barClass = 'bar-proforma'; 
                badgeColor = '#888'; 
                badgeText = 'PROFORMA'; 
            }

            const totalDisplay = doc.totalTTC ? doc.totalTTC : doc.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
            
            let convertButtons = '';
            if (doc.docType === 'devis') {
                convertButtons = `
                    <button class="btn-icon btn-convert btn-convert-proforma" onclick="convertDoc(${doc.id}, 'proforma')">➡ Proforma</button>
                    <button class="btn-icon btn-convert btn-convert-facture" onclick="convertDoc(${doc.id}, 'facture')">➡ Facture</button>
                `;
            } else if (doc.docType === 'proforma') {
                convertButtons = `
                    <button class="btn-icon btn-convert btn-convert-facture" onclick="convertDoc(${doc.id}, 'facture')">➡ Facture</button>
                `;
            }

            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="card-top-bar ${barClass}"></div>
                <div class="card-content">
                    <div class="card-header">
                        <span style="background-color: ${badgeColor}; color: ${isProforma ? '#fff' : '#000'}; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">
                            ${badgeText}
                        </span>
                        <span class="doc-number">${doc.number || 'N/A'}</span>
                    </div>
                    <div class="client-name">${doc.clientName || 'Client Inconnu'}</div>
                    <div class="doc-date">Date : ${dateStr}</div>
                    <div class="doc-amount">${formatCurrency(totalDisplay)}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-pdf" onclick="downloadPDF(${doc.id})" title="Télécharger PDF">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    <div class="action-group">
                        ${convertButtons}
                    </div>
                    <button class="btn-icon btn-delete" onclick="deleteDoc(${doc.id})" title="Supprimer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    };
}

function convertDoc(id, targetType) {
    const transaction = db.transaction(["quotes"], "readwrite");
    const store = transaction.objectStore("quotes");
    const request = store.get(id);

    request.onsuccess = function() {
        const originalQuote = request.result;
        if (originalQuote.docType === targetType) return;

        generateDocumentNumber(targetType, function(suggestedNumber) {
            
            let newNumber = prompt(`Veuillez confirmer le numéro pour la nouvelle ${targetType === 'facture' ? 'Facture' : 'Proforma'} :`, suggestedNumber);
            
            if (newNumber === null || newNumber.trim() === "") return; // إذا ألغى المستخدم
            newNumber = newNumber.trim();

            db.transaction(["quotes"], "readonly").objectStore("quotes").getAll().onsuccess = function(e) {
                const exists = e.target.result.some(d => d.number === newNumber);
                if (exists) {
                    if (!confirm(`⚠️ Le numéro "${newNumber}" existe déjà. Continuer quand même ?`)) return;
                }

                const newDoc = {
                    ...originalQuote,
                    id: Date.now(),
                    docType: targetType,
                    number: newNumber,
                    date: new Date().toISOString()
                };

                const addTransaction = db.transaction(["quotes"], "readwrite");
                const addRequest = addTransaction.objectStore("quotes").add(newDoc);
                
                addRequest.onsuccess = function() {
                    alert(`✅ Document ${newNumber} généré avec succès !`);
                    loadHistory();
                };
            };
        });
    };
}

function deleteDoc(id) {
    const transaction = db.transaction(["quotes"], "readonly");
    const request = transaction.objectStore("quotes").get(id);
    
    request.onsuccess = function() {
        const docData = request.result;
        let msg = "Voulez-vous vraiment supprimer ce document ?";
        
        if (docData.docType === 'facture') {
            msg = "⚠️ ATTENTION : La suppression d'une facture officielle est strictement réglementée. Cette action détruira la séquence de numérotation. Voulez-vous vraiment continuer ?";
        }

        if (!confirm(msg)) return;
        
        const deleteTrans = db.transaction(["quotes"], "readwrite");
        deleteTrans.objectStore("quotes").delete(id).onsuccess = function() {
            loadHistory();
        };
    };
}

function formatCurrency(amount) {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' });
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
                    if (parts.length === 2 && parts[0] === currentYear.toString()) {
                        num = parseInt(parts[1], 10);
                    }
                } else {
                    const parts = d.number.split('-');
                    if (parts.length === 2) {
                        const numPart = parts[1].split('/')[0];
                        num = parseInt(numPart, 10);
                    }
                }
                if (num > maxNumber) maxNumber = num;
            }
        });

        const nextNum = String(maxNumber + 1).padStart(3, '0');
        let finalNumber = "";
        
        if (type === 'facture') {
            finalNumber = `${currentYear}/${nextNum}`;
        } else if (type === 'proforma') {
            finalNumber = `PROFORMA-${nextNum}/${currentYear}`;
        } else {
            finalNumber = `DEVIS-${nextNum}/${currentYear}`;
        }
        callback(finalNumber);
    };
}

function downloadPDF(id) {
    const transaction = db.transaction(["quotes"], "readonly");
    const request = transaction.objectStore("quotes").get(id);

    request.onsuccess = function() {
        const docData = request.result;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        function formatNumber(num) { return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " DA"; }
        
        let titleText = docData.docType === 'facture' ? "FACTURE" : (docData.docType === 'proforma' ? "FACTURE PROFORMA" : "DEVIS");

        doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text(titleText, 196, 20, { align: "right" });
        
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`N° : ${docData.number}`, 196, 27, { align: "right" });
        doc.text(`Date : ${new Date(docData.date).toLocaleDateString('fr-FR')}`, 196, 32, { align: "right" });

        if (docData.docType !== 'facture') {
            doc.text(`Validité : ${docData.validityDays || 30} jours`, 196, 37, { align: "right" });
        }

        const settingsTx = db.transaction(["settings"], "readonly");
        const settingsReq = settingsTx.objectStore("settings").get("userProfile");
        
        settingsReq.onsuccess = function() {
            const sender = settingsReq.result || {};
            
            doc.setFontSize(11); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text((sender.senderName || 'VOTRE ENTREPRISE').toUpperCase(), 14, 55);
            
            doc.setFontSize(8); doc.setFont("helvetica", "normal");
            let y = 60;
            if(sender.senderAddress) { doc.text(sender.senderAddress, 14, y); y += 4; }
            
            let senderInfo = [];
            if(sender.senderPhone) senderInfo.push(`Tél: ${sender.senderPhone}`);
            if(sender.senderEmail) senderInfo.push(`Email: ${sender.senderEmail}`);
            if(senderInfo.length > 0) { doc.text(senderInfo.join(" | "), 14, y); y += 4; }

            let legalInfo = [];
            if(sender.senderRc) legalInfo.push(`RC: ${sender.senderRc}`);
            if(sender.senderNif) legalInfo.push(`NIF: ${sender.senderNif}`);
            if(sender.senderNis) legalInfo.push(`NIS: ${sender.senderNis}`);
            if(sender.senderAi) legalInfo.push(`AI: ${sender.senderAi}`);
            if(legalInfo.length > 0) { doc.text(legalInfo.join(" | "), 14, y); y += 4; }

            if(sender.senderBank) { doc.text(`Compte: ${sender.senderBank}`, 14, y); y += 4; }

            let cy = 55;
            doc.setFontSize(10); doc.setTextColor(100); doc.text("DOIT / CLIENT :", 120, cy - 5);
            
            doc.setTextColor(0); doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text((docData.clientName || 'CLIENT').toUpperCase(), 120, cy);
            
            doc.setFontSize(8); doc.setFont("helvetica", "normal");
            cy += 5;
            if(docData.clientAddress) { doc.text(docData.clientAddress, 120, cy); cy += 4; }
            
            let clientLegal = [];
            if(docData.clientRc) clientLegal.push(`RC: ${docData.clientRc}`);
            if(docData.clientNif) clientLegal.push(`NIF: ${docData.clientNif}`);
            if(clientLegal.length > 0) { doc.text(clientLegal.join(" | "), 120, cy); cy += 4; }

            const tableData = docData.items.map(item => [
                item.desc || 'Sans nom', item.qty.toString(), formatNumber(item.price), formatNumber(item.qty * item.price)
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
            const subtotalHT = docData.subtotalHT || docData.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
            const discountAmount = docData.discount || 0;
            const netHT = Math.max(0, subtotalHT - discountAmount);
            const tvaRate = docData.tvaRate || 0;
            const tvaAmount = docData.tvaAmount || (netHT * (tvaRate / 100));
            const totalTTC = docData.totalTTC || (netHT + tvaAmount);
            
            doc.setFontSize(9); doc.setFont("helvetica", "normal");
            doc.text("Total HT", 140, finalY); doc.text(formatNumber(subtotalHT), 196, finalY, { align: "right" });
            
            if (discountAmount > 0) {
                finalY += 5; doc.text("Remise", 140, finalY); doc.text(`- ${formatNumber(discountAmount)}`, 196, finalY, { align: "right" });
            }
            
            finalY += 5; doc.text(`TVA (${tvaRate}%)`, 140, finalY); doc.text(formatNumber(tvaAmount), 196, finalY, { align: "right" });

            finalY += 3; doc.setDrawColor(200); doc.setLineWidth(0.5); doc.line(140, finalY, 196, finalY);

            finalY += 6; doc.setFontSize(12); doc.setFont("helvetica", "bold");
            doc.text("TOTAL TTC", 140, finalY); doc.text(formatNumber(totalTTC), 196, finalY, { align: "right" });

            finalY += 15;
            doc.setFontSize(9); doc.setFont("helvetica", "bold");
            doc.text(`Conditions de paiement : ${docData.paymentTerms || 'Paiement à réception'}`, 14, finalY);
            
            if (docData.docType === 'facture') {
                finalY += 6;
                doc.setFont("helvetica", "italic");
                const words = numberToFrenchWords(totalTTC);
                const splitTitle = doc.splitTextToSize(`Arrêtée la présente facture à la somme de : ${words}`, 180);
                doc.text(splitTitle, 14, finalY);
            }

            doc.save(`${titleText.replace(' ', '_')}_${docData.number.replace('/', '-')}.pdf`);
        };
    };
}

function numberToFrenchWords(n) {
    if (n === 0) return "zéro";
    const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
    function convertGroup(num) {
        let res = "";
        if (num >= 100) {
            const h = Math.floor(num / 100);
            res += (h === 1 ? "cent " : units[h] + " cent ");
            num %= 100;
        }
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
