pipeline {
agent any

```
options {
    timestamps()
    timeout(time: 1, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '10'))
}

environment {
    IMAGE_NAME_BACKEND = 'pfe-backend'
    IMAGE_NAME_FRONTEND = 'pfe-frontend'
    IMAGE_TAG = "${BUILD_NUMBER}"
}

stages {

    stage('Checkout') {
        steps {
            checkout scm
            echo "✓ Code checked out"
        }
    }

    // 🚀 Build Backend with Docker (.NET 9)
    stage('Build Backend Image') {
        steps {
            echo "🐳 Building Backend Image..."
            sh '''
                docker build -f backend/Projet.Api/Dockerfile \
                -t ${IMAGE_NAME_BACKEND}:${IMAGE_TAG} backend

                docker tag ${IMAGE_NAME_BACKEND}:${IMAGE_TAG} \
                ${IMAGE_NAME_BACKEND}:latest
            '''
        }
    }

    // 🚀 Build Frontend with Docker (Angular)
    stage('Build Frontend Image') {
        steps {
            echo "🐳 Building Frontend Image..."
            sh '''
                docker build -f Frontend/webApp/Dockerfile \
                -t ${IMAGE_NAME_FRONTEND}:${IMAGE_TAG} Frontend/webApp

                docker tag ${IMAGE_NAME_FRONTEND}:${IMAGE_TAG} \
                ${IMAGE_NAME_FRONTEND}:latest
            '''
        }
    }

    // 🔍 Test with docker-compose
    stage('Integration Test (Docker Compose)') {
        steps {
            echo "🔍 Running integration test..."

            sh '''
                docker rm -f pfe-db pfe-backend pfe-frontend || true

                docker-compose -p pfe-ci-${BUILD_NUMBER} \
                -f docker-compose.yml up -d

                echo "⏳ Waiting services..."
                sleep 30

                docker-compose -p pfe-ci-${BUILD_NUMBER} ps

                echo "🌐 Testing API..."
                curl -f http://localhost:5000 || exit 1
            '''
        }
    }

    // 🚀 Deploy (main branch only)
    stage('Deploy') {
        when {
            branch 'main'
        }
        steps {
            echo "🚀 Deploying..."
            sh '''
                docker-compose -p pfe-prod \
                -f docker-compose.yml up -d

                docker-compose -p pfe-prod ps
            '''
        }
    }

    // ❤️ Health Check
    stage('Health Check') {
        steps {
            echo "❤️ Checking health..."

            sh '''
                for i in $(seq 1 10); do
                    if curl -fsS http://localhost:5000 > /dev/null; then
                        echo "✓ Backend OK"
                        exit 0
                    fi
                    sleep 5
                done

                echo "❌ Health check failed"
                exit 1
            '''
        }
    }
}

post {
    always {
        echo "🧹 Cleaning..."
        sh '''
            docker-compose -p pfe-ci-${BUILD_NUMBER} \
            -f docker-compose.yml down --volumes || true
        '''
        cleanWs()
    }

    success {
        echo "✅ SUCCESS"
    }

    failure {
        echo "❌ FAILED"
    }
}
```

}
