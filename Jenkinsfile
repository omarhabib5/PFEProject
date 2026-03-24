pipeline {
agent any


options {
    timestamps()
    timeout(time: 1, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '10'))
}

environment {
    IMAGE_NAME_BACKEND = 'pfe-backend'
    IMAGE_NAME_FRONTEND = 'pfe-frontend'
    IMAGE_TAG = "${BUILD_NUMBER}"
    BACKEND_HEALTH_URL = 'https://localhost:7219'
    BACKEND_INTERNAL_HEALTH_URL = 'http://backend:8080'
    CURL_IMAGE = 'curlimages/curl:8.12.1'
    SONAR_PROJECT_KEY = 'pfeproject-backend'
}

stages {

    stage('Checkout') {
        steps {
            checkout scm
            echo "✓ Code checked out"
        }
    }

    stage('Preflight (Docker)') {
        steps {
            script {
                sh '''
                    if ! command -v docker >/dev/null 2>&1; then
                        echo "Docker CLI not found in Jenkins executor PATH."
                        echo "Install Docker on the agent or run Jenkins on a Docker-enabled node."
                        exit 127
                    fi
                '''

                env.COMPOSE_CMD = sh(
                    script: '''
                        if docker compose version >/dev/null 2>&1; then
                            echo "docker compose"
                        elif command -v docker-compose >/dev/null 2>&1; then
                            echo "docker-compose"
                        else
                            echo "Neither docker compose plugin nor docker-compose binary was found."
                            exit 127
                        fi
                    ''',
                    returnStdout: true
                ).trim()

                echo "Using compose command: ${env.COMPOSE_CMD}"
            }
        }
    }

    stage('SonarQube Analysis (Optional)') {
        steps {
            sh '''
                if [ -z "${SONAR_HOST_URL}" ] || [ -z "${SONAR_TOKEN}" ]; then
                    echo "Skipping SonarQube: SONAR_HOST_URL or SONAR_TOKEN is not set."
                    exit 0
                fi

                docker run --rm --network host \
                -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
                -e SONAR_TOKEN="${SONAR_TOKEN}" \
                -e SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY}" \
                -v "$PWD:/workspace" -w /workspace/backend \
                mcr.microsoft.com/dotnet/sdk:9.0 bash -lc '
                    dotnet tool install --global dotnet-sonarscanner || dotnet tool update --global dotnet-sonarscanner
                    export PATH="$PATH:/root/.dotnet/tools"
                    dotnet sonarscanner begin /k:"${SONAR_PROJECT_KEY}" /d:sonar.host.url="${SONAR_HOST_URL}" /d:sonar.token="${SONAR_TOKEN}"
                    dotnet build backend.sln --no-incremental
                    dotnet sonarscanner end /d:sonar.token="${SONAR_TOKEN}"
                '
            '''
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

                ${COMPOSE_CMD} -p pfe-ci-${BUILD_NUMBER} \
                -f docker-compose.yml up -d

                echo "⏳ Waiting services..."
                sleep 30

                ${COMPOSE_CMD} -p pfe-ci-${BUILD_NUMBER} ps

                echo "🌐 Testing API..."
                for i in $(seq 1 12); do
                    if docker run --rm --network host ${CURL_IMAGE} -ksS --connect-timeout 2 --max-time 5 ${BACKEND_HEALTH_URL} > /dev/null 2>&1; then
                        echo "✓ Backend reachable on ${BACKEND_HEALTH_URL}"
                        exit 0
                    fi

                    if docker run --rm --network pfe-ci-${BUILD_NUMBER}_default ${CURL_IMAGE} -sS --connect-timeout 2 --max-time 5 ${BACKEND_INTERNAL_HEALTH_URL} > /dev/null 2>&1; then
                        echo "✓ Backend reachable on ${BACKEND_INTERNAL_HEALTH_URL}"
                        exit 0
                    fi

                    sleep 5
                done

                echo "❌ API check failed after retries"
                ${COMPOSE_CMD} -p pfe-ci-${BUILD_NUMBER} logs backend || true
                exit 1
            '''
        }
    }

    // ❤️ Health Check
    stage('Health Check') {
        steps {
            echo "❤️ Checking health..."

            sh '''
                for i in $(seq 1 12); do
                    if docker run --rm --network host ${CURL_IMAGE} -ksS --connect-timeout 2 --max-time 5 ${BACKEND_HEALTH_URL} > /dev/null 2>&1; then
                        echo "✓ Backend OK on ${BACKEND_HEALTH_URL}"
                        exit 0
                    fi

                    if docker run --rm --network pfe-ci-${BUILD_NUMBER}_default ${CURL_IMAGE} -sS --connect-timeout 2 --max-time 5 ${BACKEND_INTERNAL_HEALTH_URL} > /dev/null 2>&1; then
                        echo "✓ Backend OK on ${BACKEND_INTERNAL_HEALTH_URL}"
                        exit 0
                    fi

                    sleep 5
                done

                echo "❌ Health check failed"
                ${COMPOSE_CMD} -p pfe-ci-${BUILD_NUMBER} logs backend || true
                exit 1
            '''
        }
    }

    // 🚀 Deploy (main branch only, after checks)
    stage('Deploy') {
        when {
            branch 'main'
        }
        steps {
            echo "🚀 Deploying to production stack..."
            sh '''
                ${COMPOSE_CMD} -p pfe-prod \
                -f docker-compose.yml up -d

                ${COMPOSE_CMD} -p pfe-prod ps

                for i in $(seq 1 12); do
                    if docker run --rm --network host ${CURL_IMAGE} -ksS --connect-timeout 2 --max-time 5 ${BACKEND_HEALTH_URL} > /dev/null 2>&1; then
                        echo "✓ Production backend reachable on ${BACKEND_HEALTH_URL}"
                        exit 0
                    fi
                    sleep 5
                done

                echo "❌ Production health check failed"
                ${COMPOSE_CMD} -p pfe-prod logs backend || true
                exit 1
            '''
        }
    }
}

post {
    always {
        echo "🧹 Cleaning..."
        sh '''
            ${COMPOSE_CMD:-docker compose} -p pfe-ci-${BUILD_NUMBER} \
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


}
