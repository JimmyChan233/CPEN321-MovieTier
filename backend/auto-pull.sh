#!/bin/bash

# Git Auto-Pull Script
# This script checks for new updates on GitHub and automatically pulls them

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="/home/azureuser/CPEN321-MovieTier"
WATCH_MODE=false
CHECK_INTERVAL=60  # seconds between checks in watch mode
BRANCH=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -w|--watch)
      WATCH_MODE=true
      shift
      ;;
    -i|--interval)
      CHECK_INTERVAL="$2"
      shift 2
      ;;
    -b|--branch)
      BRANCH="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -w, --watch              Run in watch mode (continuous checking)"
      echo "  -i, --interval SECONDS   Set check interval for watch mode (default: 60)"
      echo "  -b, --branch BRANCH      Specify branch to track (default: current branch)"
      echo "  -h, --help               Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                       Check once and exit"
      echo "  $0 --watch               Run continuously"
      echo "  $0 --watch --interval 30 Check every 30 seconds"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Function to check and pull updates
check_and_pull() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Checking for updates..."

  # Change to repository directory
  cd "$REPO_DIR" || {
    echo -e "${RED}❌ Error: Cannot access repository directory: $REPO_DIR${NC}"
    return 1
  }

  # Check if it's a git repository
  if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    return 1
  fi

  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted local changes${NC}"
    echo -e "${YELLOW}   Skipping pull to avoid conflicts${NC}"
    return 1
  fi

  # Fetch the latest changes from remote
  echo -e "${BLUE}📡 Fetching from remote...${NC}"
  if ! git fetch origin "$BRANCH" 2>/dev/null; then
    echo -e "${RED}❌ Error: Failed to fetch from remote${NC}"
    return 1
  fi

  # Get the current local commit hash
  LOCAL=$(git rev-parse HEAD)

  # Get the remote commit hash
  REMOTE=$(git rev-parse "origin/$BRANCH")

  # Compare local and remote
  if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✅ Already up to date${NC}"
    return 0
  fi

  # Check if remote is ahead
  if git merge-base --is-ancestor "$LOCAL" "$REMOTE"; then
    echo -e "${YELLOW}📥 New updates available!${NC}"

    # Show what's new
    echo -e "${BLUE}Changes:${NC}"
    git log --oneline --pretty=format:"  %C(yellow)%h%C(reset) - %s %C(green)(%cr)%C(reset)" HEAD..origin/"$BRANCH" | head -5
    echo ""

    # Pull the changes
    echo -e "${BLUE}🔄 Pulling updates...${NC}"
    if git pull origin "$BRANCH"; then
      echo -e "${GREEN}✅ Successfully pulled latest changes!${NC}"

      # Show current commit
      echo -e "${BLUE}Current commit:${NC}"
      git log -1 --oneline --pretty=format:"  %C(yellow)%h%C(reset) - %s %C(green)(%cr)%C(reset)"
      echo -e "\n"
      return 0
    else
      echo -e "${RED}❌ Error: Failed to pull changes${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠️  Warning: Local branch has diverged from remote${NC}"
    echo -e "${YELLOW}   Manual intervention required${NC}"
    return 1
  fi
}

# Main execution
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}   Git Auto-Pull Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "Repository: ${YELLOW}$REPO_DIR${NC}"
echo -e "Branch: ${YELLOW}$BRANCH${NC}"
echo -e "Mode: ${YELLOW}$([ "$WATCH_MODE" = true ] && echo "Watch (every ${CHECK_INTERVAL}s)" || echo "Single check")${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

if [ "$WATCH_MODE" = true ]; then
  echo -e "${GREEN}🔄 Starting watch mode... (Press Ctrl+C to stop)${NC}\n"

  # Run continuously
  while true; do
    check_and_pull
    echo -e "${BLUE}💤 Waiting ${CHECK_INTERVAL} seconds...${NC}\n"
    sleep "$CHECK_INTERVAL"
  done
else
  # Run once
  check_and_pull
  exit $?
fi
