# SmartMine Flask Backend

## Setup

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The server will start on http://localhost:5000

## API Endpoints

### POST /api/upload
Upload a CSV or Excel dataset.

```bash
curl -X POST -F "file=@dataset.csv" http://localhost:5000/api/upload
```

### POST /api/preprocess
Apply preprocessing options to the dataset.

```bash
curl -X POST http://localhost:5000/api/preprocess \
  -H "Content-Type: application/json" \
  -d '{"remove_duplicates": true, "min_items": 2}'
```

### POST /api/mine
Execute pattern mining.

```bash
curl -X POST http://localhost:5000/api/mine \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "apriori", "min_support": 0.1, "min_confidence": 0.5}'
```

### GET /api/dataset/info
Get dataset statistics.

### GET /api/algorithms
List available algorithms.

## Algorithms

| Algorithm | Type | Implementation |
|-----------|------|----------------|
| Apriori | Frequent | mlxtend |
| FP-Growth | Frequent | mlxtend |
| ECLAT | Frequent | Custom Python |
| H-Mine | Frequent | Custom Python |
| CARMA | Frequent | Custom Python |
| CHARM | Closed | Custom Python |
| CLOSET | Closed | Custom Python |
| MaxMiner | Maximal | Custom Python |

## SPMF Integration (Optional)

For Java-based SPMF algorithms, place `spmf.jar` in the `spmf/` folder.
Download from: http://www.philippe-fournier-viger.com/spmf/
