javascript:(function(){
    function cleanNumericString(str){
        return str.replace(/[^\d.]/g,'');
    }

    function calculateEHP(hp,defense){
        return hp*(1+defense/1000);
    }

    function findStatValue(container,statLabel){
        const rows=container.getElementsByClassName('hero_stats_row');
        for(let i=0;i<rows.length;i++){
            const row=rows[i];
            const divs=row.getElementsByTagName('div');
            if(divs.length>=2){
                const label=divs[0].textContent.trim();
                if(label===statLabel){
                    const value=cleanNumericString(divs[1].textContent.trim());
                    return parseFloat(value);
                }
            }
        }
        return null;
    }

    function findStatValueInTable(table,statLabel){
        const rows=table.getElementsByTagName('tr');
        for(let i=0;i<rows.length;i++){
            const row=rows[i];
            const cells=row.getElementsByTagName('td');
            if(cells.length>=2){
                const label=cells[0].textContent.trim();
                if(label===statLabel){
                    const value=cleanNumericString(cells[1].textContent.trim());
                    return parseFloat(value);
                }
            }
        }
        return null;
    }

    function updateEffectiveHP(){
        // Handle the original hero_stats_model format
        const statsContainers=document.getElementsByClassName('hero_stats_model');
        if(statsContainers&&statsContainers.length>0){
            for(let container of statsContainers){
                const hp=findStatValue(container,'HP');
                const defense=findStatValue(container,'DEF');

                if(!hp||!defense)continue;

                const ehp=calculateEHP(hp,defense);
                const formattedEHP=Math.round(ehp).toLocaleString();

                const columns=container.getElementsByClassName('hero_stats_column');
                const lastColumn=columns[columns.length-1];

                const newRow=document.createElement('div');
                newRow.className='hero_stats_row';
                newRow.innerHTML='<div style="font-weight:bold;color:#7289da;">Effective HP</div><div style="font-weight:bold;color:#7289da;">'+formattedEHP+'</div>';

                const existingRows=lastColumn.getElementsByClassName('hero_stats_row');
                for(let i=0;i<existingRows.length;i++){
                    if(existingRows[i].textContent.includes('Effective HP')){
                        lastColumn.removeChild(existingRows[i]);
                        break;
                    }
                }

                lastColumn.appendChild(newRow);
            }
        }

        // Handle the new table format
        const statTables=document.getElementsByClassName('short_table');
        if(statTables&&statTables.length>0){
            for(let table of statTables){
                const hp=findStatValueInTable(table,'HP');
                const defense=findStatValueInTable(table,'Def');

                if(!hp||!defense)continue;

                const ehp=calculateEHP(hp,defense);
                const formattedEHP=Math.round(ehp).toLocaleString();

                // Remove existing EHP row if present
                const rows=table.getElementsByTagName('tr');
                for(let i=0;i<rows.length;i++){
                    if(rows[i].textContent.includes('Effective HP')){
                        table.removeChild(rows[i]);
                        break;
                    }
                }

                // Create new EHP row
                const newRow=document.createElement('tr');
                newRow.setAttribute('_ngcontent-fia-c69','');
                newRow.innerHTML='<td _ngcontent-fia-c69="" style="font-weight:bold;color:#7289da;">Effective HP</td><td _ngcontent-fia-c69="" class="text-right" style="font-weight:bold;color:#7289da;">'+formattedEHP+'</td>';
                table.appendChild(newRow);
            }
        }
        
        // Handle the raid optimizer results grid
        const resultsGrids = document.getElementsByClassName('results_grid');
        if (resultsGrids && resultsGrids.length > 0) {
            for (let grid of resultsGrids) {
                // Process each row of data
                const statsItems = Array.from(grid.querySelectorAll('.results_stats'));
                if (statsItems.length > 8) { // Ensure we have enough elements (headers + data)
                    // Group stats by row (8 stats per character)
                    const statsPerRow = 8;
                    const headers = grid.querySelectorAll('.results_grid-header');
                    
                    // Update the HP header if not already updated
                    const hpHeader = headers[0]; // First header is HP
                    if (hpHeader && !hpHeader.textContent.includes('EHP')) {
                        hpHeader.innerHTML = 'HP / <span style="color:#7289da">EHP</span>';
                    }
                    
                    const rows = Math.floor((statsItems.length - statsPerRow) / statsPerRow);
                    
                    for (let i = 0; i < rows; i++) {
                        const startIdx = statsPerRow + (i * statsPerRow);
                        // Get HP and DEF values (first and third stats in each row)
                        const hpElement = statsItems[startIdx];
                        const defElement = statsItems[startIdx + 2];
                        
                        if (hpElement && defElement) {
                            const hpText = hpElement.textContent;
                            // Skip if this element has already been processed
                            if (hpText.includes('/')) continue;
                            
                            const hp = parseFloat(cleanNumericString(hpText));
                            const def = parseFloat(cleanNumericString(defElement.textContent));
                            
                            if (!isNaN(hp) && !isNaN(def)) {
                                const ehp = calculateEHP(hp, def);
                                const formattedHP = Math.round(hp).toLocaleString();
                                const formattedEHP = Math.round(ehp).toLocaleString();
                                
                                // Replace content with both HP and EHP values
                                hpElement.innerHTML = formattedHP + ' / <span style="color:#7289da">' + formattedEHP + '</span>';
                            }
                        }
                    }
                }
            }
        }
    }

    // Run the function immediately and set interval
    updateEffectiveHP();
    setInterval(updateEffectiveHP, 1000);
})();
