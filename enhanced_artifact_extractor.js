javascript:(function() {
  // Scoring configuration
  const starCountValues = {
    1: -40, 2: -20, 3: 0, 4: 35, 5: 70, 6: 100,
  };
  const substatValues = {
    "SPD": 10, "C.RATE%": 9, "C.DMG%": 9, "RES": 8, "ACC": 9,
    "HP%": 8, "DEF%": 8, "ATK%": 8, "HP": 1, "DEF": 1, "ATK": 1,
  };
  const mainStatValues = {
    "SPD": 10, "C.RATE%": 9, "C.DMG%": 9, "RES": 8, "ACC": 9,
    "HP%": 8, "DEF%": 8, "ATK%": 8, "HP": 2, "DEF": 2, "ATK": 2,
  };
  const rarityValues = {
    "Common": 1, "Uncommon": 2, "Rare": 3, "Epic": 4, "Legendary": 5, "Mythical": 6,
  };
  const rollDuplicatesByRarity = {
    "Common": 0, "Uncommon": 1, "Rare": 2, "Epic": 3, "Legendary": 4, "Mythical": 5,
  };
  const substatBaseCountByRarity = {
    "Common": 0, "Uncommon": 1, "Rare": 2, "Epic": 3, "Legendary": 4, "Mythical": 5,
  };

  // Helper function for case-insensitive lookup
  function lookupValue(obj, key) {
    if (!key) return 0;
    
    // Direct lookup first
    if (obj[key] !== undefined) return obj[key];
    
    // Case insensitive lookup
    const lowerKey = key.toLowerCase();
    for (const k in obj) {
      if (k.toLowerCase() === lowerKey) {
        console.log(`Case-insensitive match: "${key}" -> "${k}"`);
        return obj[k];
      }
    }
    
    console.log(`No match found for key: "${key}"`);
    return 0;
  }

  // Function to extract information from a single artifact element
  function extractSingleArtifactInfo(artifactElement) {
    // Find the artifact default layer
    const artifactLayer = artifactElement.querySelector('.artifact_default-layer');
    if (!artifactLayer) {
      console.error('Artifact layer not found');
      return null;
    }
    
    // Get the number of stars
    function getStarsCount() {
      const starsElements = artifactLayer.querySelectorAll('.artifact_stars .artifact_stars_normal');
      return starsElements.length;
    }
    
    // Get rarity from class
    function getRarity() {
      const classList = artifactElement.className.split(' ');
      for (const cls of classList) {
        if (cls.includes('legendary')) return 'Legendary';
        if (cls.includes('epic')) return 'Epic';
        if (cls.includes('rare')) return 'Rare';
        if (cls.includes('uncommon')) return 'Uncommon';
        if (cls.includes('common')) return 'Common';
      }
      return 'Unknown';
    }
    
    // Get artifact type from image src
    function getType() {
      const imageElement = artifactLayer.querySelector('.artifact_image');
      if (!imageElement || !imageElement.src) return 'Unknown';
      
      const srcParts = imageElement.src.split('/');
      const fileName = srcParts[srcParts.length - 1];
      const typeParts = fileName.split('_');
      
      if (typeParts.length >= 2) {
        // Remove file extension and capitalize
        const type = typeParts[1].replace(/\.[^/.]+$/, '');
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
      
      return 'Unknown';
    }
    
    // Get primary stat
    function getPrimaryStat() {
      const statTitleElement = artifactLayer.querySelector('.artifact_primary .artifact_stat_title');
      const statValueElement = artifactLayer.querySelector('.artifact_primary .artifact_stat_value');
      
      if (!statTitleElement || !statValueElement) return { stat: 'Unknown', value: '0' };
      
      return {
        stat: statTitleElement.textContent.trim(),
        value: statValueElement.textContent.trim()
      };
    }
    
    // Get substats
    function getSubstats() {
      const substats = [];
      const substatElements = artifactLayer.querySelectorAll('.artifact_substat');
      
      substatElements.forEach(element => {
        const titleElement = element.querySelector('.artifact_stat_title');
        const valueElement = element.querySelector('.artifact_stat_value');
        const rollCountElement = element.querySelector('.artifact_roll_count');
        
        if (titleElement && valueElement) {
          let title = titleElement.textContent.trim();
          const value = valueElement.textContent.trim();
          
          // Roll count handling
          let rolls = 0;
          if (rollCountElement) {
            const rollCount = rollCountElement.textContent;
            rolls = parseInt(rollCount.match(/\d+/)[0]);
            
            title = title.split('(')[0].trim();
            title = rolls > 0 ? `${title}(${rolls})` : title;
          }
          
          substats.push({
            stat: title,
            value: value,
            rolls: rolls
          });
        }
      });
      
      return substats;
    }
    
    // Get level
    function getLevel() {
      const levelElement = artifactLayer.querySelector('.artifact_level');
      return levelElement ? parseInt(levelElement.textContent) : 0;
    }
    
    // Extract all the information
    const stars = getStarsCount();
    const rarity = getRarity();
    const type = getType();
    const level = getLevel();
    const primaryStat = getPrimaryStat();
    const substats = getSubstats();
    
    return {
      stars,
      rarity,
      type,
      level,
      primaryStat,
      substats
    };
  }

  // Enhanced scoring functions with detailed logging
  function substatScore(substats, rarity, debug = false) {
    let scoreTotal = 0;
    console.log("==== Substat Score Calculation ====");
    console.log(`Rarity: ${rarity}`);
    console.log(`Substats:`, JSON.stringify(substats));

    if (!lookupValue(rarityValues, rarity)) {
      console.log("Invalid rarity value");
      return 0;
    }
    
    if (!Array.isArray(substats) || substats.length === 0 || substats.length > 4) {
      console.log("Invalid substats");
      return 0;
    }

    let totalRolls = 0;
    let highestRoll = 0;
    let rollsRemaining = lookupValue(rollDuplicatesByRarity, rarity);

    for (const substat of substats) {
      if (substat.stat.includes('(')) {
        const rollValue = parseInt(substat.stat.split('(')[1]);
        totalRolls += rollValue;
        
        if (rollValue > highestRoll) {
          highestRoll = rollValue;
        }
        
        rollsRemaining -= rollValue;
        console.log(`Found roll in ${substat.stat}: ${rollValue} rolls`);
      }
    }

    console.log(`Total rolls: ${totalRolls}`);
    console.log(`Highest roll: ${highestRoll}`);
    console.log(`Rolls remaining: ${rollsRemaining}`);

    if (highestRoll > lookupValue(rollDuplicatesByRarity, rarity)) {
      console.log(`Error: Too many rolls (${highestRoll}) for rarity ${rarity} (max ${lookupValue(rollDuplicatesByRarity, rarity)})`);
      return 0;
    }

    for (const substat of substats) {
      let multiplier = 1;
      let lookupKey = substat.stat;
      
      if (substat.stat.includes('(')) {
        const rollCount = parseInt(substat.stat.split('(')[1]);
        multiplier = 1 + rollCount;
        lookupKey = substat.stat.split('(')[0].trim();
      }

      if (substat.value.includes('%')) {
        lookupKey += '%';
      }

      const baseScore = lookupValue(substatValues, lookupKey);
      const score = baseScore * multiplier;
      
      console.log(`Substat: ${lookupKey}, Base Value: ${baseScore}, Multiplier: ${multiplier}, Score: ${score}`);
      
      scoreTotal += score;
    }

    console.log(`Final Substat Score: ${scoreTotal}`);
    return scoreTotal;
  }

  function mainStatScore(mainStat, value, level, artifactType = 'Unknown') {
    console.log("==== Main Stat Score Calculation ====");
    let statKey = mainStat;
    if (value.includes('%')) {
      statKey = mainStat + '%';
    }
    
    console.log(`Main Stat: ${statKey}, Level: ${level}, Artifact Type: ${artifactType}`);
    
    let baseValue = lookupValue(mainStatValues, statKey);
    const statWeight = 1.2;
    const levelMultiplier = level + 1;
    if (artifactType === 'Helmet') {
      baseValue = baseValue * 4.5;
    } else if (artifactType === 'Shield') {
      baseValue = baseValue * 4.5;
    } else if (artifactType === 'Weapon') {
      baseValue = baseValue * 4.5;
    }
    let score = baseValue * statWeight * levelMultiplier;
    
    console.log(`Base Value: ${baseValue}, Weight: ${statWeight}, Level Multiplier: ${levelMultiplier}`);
    console.log(`Final Main Stat Score: ${score}`);
    
    return score;
  }

  function rarityScore(rarity) {
    const score = lookupValue(rarityValues, rarity);
    console.log(`==== Rarity Score: ${rarity} = ${score} ====`);
    return score;
  }

  function starCountScore(starCount) {
    const score = lookupValue(starCountValues, starCount);
    console.log(`==== Star Count Score: ${starCount}★ = ${score} ====`);
    return score;
  }

  function getRating(score) {
    if (score > 380) return "Invalid score";
    if (score <= 50) return "Trash";
    if (score <= 120) return "Very Weak";
    if (score <= 180) return "Weak";
    if (score <= 250) return "Average";
    if (score <= 300) return "Strong";
    if (score <= 350) return "Very Strong";
    return "Godlike";
  }

  function totalScore(artifact) {
    console.log("=======================================");
    console.log("TOTAL SCORE CALCULATION");
    console.log("=======================================");
    console.log("Artifact:", JSON.stringify(artifact));
    
    const mainStat = artifact.primaryStat.stat;
    const mainStatValue = artifact.primaryStat.value;
    const substats = artifact.substats;
    const rarity = artifact.rarity;
    const starCount = artifact.stars;
    const level = artifact.level || 0;
    const type = artifact.type || 'Unknown'
    
    const mainStatScoreValue = mainStatScore(mainStat, mainStatValue, level, type);
    const substatScoreValue = substatScore(substats, rarity, true);
    const rarityScoreValue = rarityScore(rarity);
    const starCountScoreValue = starCountScore(starCount);
    
    const totalScoreValue = mainStatScoreValue + substatScoreValue + rarityScoreValue + starCountScoreValue;
    
    console.log("====== Score Summary ======");
    console.log(`Main Stat Score: ${mainStatScoreValue}`);
    console.log(`Substat Score: ${substatScoreValue}`);
    console.log(`Rarity Score: ${rarityScoreValue}`);
    console.log(`Star Count Score: ${starCountScoreValue}`);
    console.log(`Total Score: ${totalScoreValue}`);
    console.log(`Rating: ${getRating(totalScoreValue)}`);
    console.log("=======================================");
    
    return {
      score: totalScoreValue,
      rating: getRating(totalScoreValue),
      breakdown: {
        mainStatScore: mainStatScoreValue,
        substatScore: substatScoreValue,
        rarityScore: rarityScoreValue,
        starCountScore: starCountScoreValue
      }
    };
  }

  function rollGenerator(substats, rarity, mainStat, debug = false) {
    if (debug) console.log("==== Roll Generator ====");
    // Make a deep copy of substats to avoid modifying the original
    substats = JSON.parse(JSON.stringify(substats));
    
    if (debug) console.log(`Input substats: ${JSON.stringify(substats)}`);
    if (debug) console.log(`Rarity: ${rarity}`);
    
    if (!lookupValue(rarityValues, rarity)) {
      throw new Error("Invalid rarity value");
    }
    
    if (substats.length > 4) {
      throw new Error("Too many substats provided");
    }
    
    // If no substats, add the best ones
    if (substats.length === 0) {
      if (debug) console.log("No substats, adding optimal substats");
      if (mainStat.stat !== 'SPD') {
        substats.push({ stat: 'SPD', value: '7', rolls: 0 });
      }
      if (mainStat.stat !== 'C.RATE') {
        substats.push({ stat: 'C.RATE', value: '4%', rolls: 0 });
      }
      if (mainStat.stat !== 'C.DMG') {
        substats.push({ stat: 'C.DMG', value: '3%', rolls: 0 });
      }
      if (substats.length < 4 && mainStat.stat !== 'RES') {
        substats.push({ stat: 'RES', value: '12', rolls: 0 });
      }
      if (substats.length < 4 && mainStat.stat !== 'ACC') {
        substats.push({ stat: 'ACC', value: '7', rolls: 0 });
      }
      if (debug) console.log(`Added default substats: ${JSON.stringify(substats)}`);
      return rollGenerator(substats, rarity, mainStat, debug);
    }
    
    // Check total number of rolls
    let totalRolls = 0;
    let highestRoll = 0;
    let rollsRemaining = lookupValue(rollDuplicatesByRarity, rarity);
    let highestRollSubstat = null;
    let highestRollIndex = -1;
    
    for (let i = 0; i < substats.length; i++) {
      const substat = substats[i];
      if (substat.stat.includes('(')) {
        const rollValue = parseInt(substat.stat.split('(')[1]);
        totalRolls += rollValue;
        
        if (rollValue > highestRoll) {
          highestRoll = rollValue;
          highestRollSubstat = substat;
          highestRollIndex = i;
        }
        
        rollsRemaining -= rollValue;
        if (debug) console.log(`Found roll in ${substat.stat}: ${rollValue} rolls`);
      }
      
      // Check if max rolls reached
      if (substats.length + totalRolls === lookupValue(substatBaseCountByRarity, rarity) + lookupValue(rollDuplicatesByRarity, rarity)) {
        if (debug) console.log(`Max rolls reached for rarity ${rarity}. Total rolls: ${totalRolls}`);
        return substats;
      }
    }
    
    if (debug) {
      console.log(`Total rolls: ${totalRolls}`);
      console.log(`Highest roll: ${highestRoll}`);
      console.log(`Rolls remaining: ${rollsRemaining}`);
    }
    
    // Handle max duplicate roll case
    if (highestRoll === lookupValue(rollDuplicatesByRarity, rarity)) {
      if (debug) console.log(`Max duplicate rolls (${highestRoll}) reached for rarity ${rarity}`);
      
      if (substats.length < 4) {
        if (debug) console.log(`Adding new substat for rarity ${rarity}`);
        // Attempt to add the best substats that aren't already present
        const existingSubstats = substats.map(s => s.stat.split('(')[0].trim());
        
        const potentialStats = [
          { stat: 'C.RATE', value: '4%', rolls: 0 },
          { stat: 'C.DMG', value: '3%', rolls: 0 },
          { stat: 'SPD', value: '7', rolls: 0 },
          { stat: 'RES', value: '12', rolls: 0 },
          { stat: 'ACC', value: '7', rolls: 0 },
          { stat: 'HP%', value: '1%', rolls: 0 },
          { stat: 'DEF%', value: '1%', rolls: 0 },
          { stat: 'ATK%', value: '1%', rolls: 0 }
        ];
        
        for (const stat of potentialStats) {
          if (!existingSubstats.includes(stat.stat) && mainStat.stat !== stat.stat) {
            if (debug) console.log(`Adding new substat: ${stat.stat}`);
            substats.push(stat);
            return rollGenerator(substats, rarity, mainStat, debug);
          }
        }
      }
      
      if (substats.length === 4) {
        if (debug) console.log(`Max substats (4) reached for rarity ${rarity}`);
        return substats;
      }
    }
    
    // Handle too many rolls case
    if (highestRoll > lookupValue(rollDuplicatesByRarity, rarity)) {
      if (debug) console.log(`Too many rolls for rarity ${rarity}. Max: ${lookupValue(rollDuplicatesByRarity, rarity)}, Found: ${highestRoll}`);
      return substats;
    }
    
    // Handle no duplicate rolls case
    if (highestRoll === 0) {
      if (debug) console.log(`No duplicate rolls found for rarity ${rarity}, adding first roll`);
      
      // Roll into the best stat available
      const priorityOrder = ['SPD', 'C.RATE', 'C.DMG', 'RES', 'ACC'];
      
      for (const priority of priorityOrder) {
        for (let i = 0; i < substats.length; i++) {
          const substat = substats[i];
          const baseStat = substat.stat.split('(')[0].trim();
          
          if (baseStat === priority) {
            if (debug) console.log(`Rolling into priority stat: ${priority}`);
            substats[i] = { 
              stat: `${baseStat}(1)`, 
              value: substat.value, 
              rolls: 1 
            };
            return rollGenerator(substats, rarity, mainStat, debug);
          }
        }
      }
      
      // If no priority match, roll into first substat
      if (debug) console.log(`No priority stat found, rolling into first substat`);
      const firstSubstat = substats[0];
      const baseStat = firstSubstat.stat.split('(')[0].trim();
      substats[0] = { 
        stat: `${baseStat}(1)`, 
        value: firstSubstat.value, 
        rolls: 1 
      };
      return rollGenerator(substats, rarity, mainStat, debug);
    }
    
    // Add another roll to highest roll substat
    if (highestRoll !== lookupValue(rollDuplicatesByRarity, rarity) && highestRollIndex !== -1) {
      if (debug) console.log(`Adding roll to highest roll substat: ${highestRollSubstat.stat} -> ${highestRoll + 1} rolls`);
      
      const baseStat = highestRollSubstat.stat.split('(')[0].trim();
      
      substats[highestRollIndex] = { 
        stat: `${baseStat}(${highestRoll + 1})`, 
        value: highestRollSubstat.value, 
        rolls: highestRoll + 1 
      };
      
      return rollGenerator(substats, rarity, mainStat, debug);
    }
    
    return substats;
  }

  function maxPotentialScore(artifact) {
    console.log("=======================================");
    console.log("MAX POTENTIAL SCORE CALCULATION");
    console.log("=======================================");
    console.log("Original Artifact:", JSON.stringify(artifact));
    
    const mainStat = artifact.primaryStat;
    const substats = JSON.parse(JSON.stringify(artifact.substats)); // Deep copy
    const rarity = artifact.rarity;
    const starCount = artifact.stars;
    const level = 16; // Max level
    
    // Roll substats to max
    const maxedSubstats = rollGenerator(substats, rarity, mainStat, true);
    console.log("Max Potential Substats:", JSON.stringify(maxedSubstats));
    
    // Calculate score
    const maxMainStatScore = mainStatScore(mainStat.stat, mainStat.value, level, artifact.type);
    const maxSubstatScore = substatScore(maxedSubstats, rarity, true);
    const maxRarityScore = rarityScore(rarity);
    const maxStarCountScore = starCountScore(starCount);
    
    const maxTotalScore = maxMainStatScore + maxSubstatScore + maxRarityScore + maxStarCountScore;
    const rating = getRating(maxTotalScore);
    
    console.log("====== Max Score Summary ======");
    console.log(`Max Main Stat Score: ${maxMainStatScore}`);
    console.log(`Max Substat Score: ${maxSubstatScore}`);
    console.log(`Max Rarity Score: ${maxRarityScore}`);
    console.log(`Max Star Count Score: ${maxStarCountScore}`);
    console.log(`Max Total Score: ${maxTotalScore}`);
    console.log(`Max Rating: ${rating}`);
    console.log("=======================================");
    
    return {
      score: maxTotalScore,
      rating: rating,
      breakdown: {
        mainStatScore: maxMainStatScore,
        substatScore: maxSubstatScore,
        rarityScore: maxRarityScore,
        starCountScore: maxStarCountScore
      }
    };
  }

  // Function to update artifact info with scoring
  function updateArtifactInfo(artifact, artifactInfo) {
    // Find the artifact_info div
    let artifactInfoDiv = artifact.querySelector('.artifact_info');

    // If it doesn't exist, create it
    if (!artifactInfoDiv) {
      artifactInfoDiv = document.createElement('div');
      artifactInfoDiv.className = 'artifact_info';
      artifactInfoDiv.style.marginTop = '5px';
      artifact.appendChild(artifactInfoDiv);
    }

    // Check if score already exists
    if (artifact.querySelector('.artifact_score')) {
      // Score already exists, don't recreate
      return;
    }

    // Calculate and display score
    const scoreInfo = totalScore(artifactInfo);
    const potentialInfo = maxPotentialScore(artifactInfo);
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'artifact_score';
    scoreDiv.style.fontSize = '10px';
    scoreDiv.style.fontWeight = 'bold';
    scoreDiv.style.marginTop = '3px';
    
    // Color coding based on rating
    let ratingColor;
    switch(scoreInfo.rating) {
      case 'Trash': ratingColor = '#888888'; break;
      case 'Very Weak': ratingColor = '#df6bff'; break;
      case 'Weak': ratingColor = '#c3eb34'; break;
      case 'Average': ratingColor = '#6be4ff'; break;
      case 'Strong': ratingColor = '#38ff88'; break;
      case 'Very Strong': ratingColor = '#ffdb38'; break;
      case 'Godlike': ratingColor = '#ff0000'; break;
      default: ratingColor = '#666666';
    }
    
    scoreDiv.innerHTML = `<span style="color:${ratingColor}">${Math.floor(scoreInfo.score)} (${scoreInfo.rating})</span> <br> <span style="color:#ffffff">${Math.floor(potentialInfo.score)} (${potentialInfo.rating})</span>`;
    artifactInfoDiv.appendChild(scoreDiv);
  }

  // Function to extract data from all artifacts
  function extractAllArtifacts() {
    const allArtifacts = document.querySelectorAll('.artifact');
    console.log(`Found ${allArtifacts.length} artifacts`);

    allArtifacts.forEach((artifact, index) => {
      const artifactInfo = extractSingleArtifactInfo(artifact);
      if (artifactInfo) {
        updateArtifactInfo(artifact, artifactInfo);
      }
    });
  }

  // Track if script is already running
  if (window._artifactScoringRunning) {
    console.log("Artifact scoring already running, stopping previous instance");
    clearInterval(window._artifactScoringInterval);
  }

  // Run the extraction once immediately
  try {
    console.log("====== SHADOW ARTIFACT SCORING CALCULATOR ======");
    console.log("Initial run - calculating scores for visible artifacts...");
    
    extractAllArtifacts();
    
    // Set flag to indicate script is running
    window._artifactScoringRunning = true;
    
    // Set up interval to run every second
    window._artifactScoringInterval = setInterval(function() {
      try {
        extractAllArtifacts();
      } catch (error) {
        console.error('Error in interval artifact scoring:', error.message);
      }
    }, 2000);
    
    console.log("Artifact scoring running on 1-second interval");
    console.log("Press F12 and run 'clearInterval(window._artifactScoringInterval)' to stop");
  } catch (error) {
    console.error('Error starting artifact scoring:', error.message);
  }
})();
