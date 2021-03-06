const Long = require('long'),
  wfHistoryThrift = [
    {
      eventId: new Long(1),
      eventTime: new Long(800610625, 351737684, false),
      eventType: 'WorkflowExecutionStarted',
      workflowExecutionStartedEventAttributes: {
        attempt: null,
        workflowType: {
          name: 'github.com/temporalio/temporal/demo',
        },
        taskQueue: {
          name: 'ci-task-queue',
          kind: null,
        },
        identity: null,
        input: Buffer.from(
          JSON.stringify({
            emails: ['jane@example.com', 'bob@example.com'],
            includeFooter: true,
          })
        ),
        expirationeventTime: null,
        continuedExecutionRunId: null,
        continuedFailureDetails: null,
        continuedFailureReason: null,
        cronSchedule: null,
        firstWorkflowTaskBackoffSeconds: null,
        firstExecutionRunId: null,
        header: null,
        initiator: null,
        lastCompletionResult: null,
        memo: null,
        originalExecutionRunId: null,
        parentInitiatedEventId: null,
        parentWorkflowNamespace: null,
        parentWorkflowExecution: null,
        prevAutoResetPoints: null,
        retryPolicy: null,
        searchAttributes: null,
        taskStartToCloseTimeoutSeconds: 30,
        executionStartToCloseTimeoutSeconds: 1080,
      },
    },
    {
      eventId: new Long(2),
      eventTime: new Long(800610625, 351737684, false),
      eventType: 'WorkflowTaskScheduled',
      workflowTaskScheduledEventAttributes: {
        startToCloseTimeoutSeconds: 180,
        attempt: 1,
        taskQueue: {
          name: 'canary-task-queue',
          kind: null,
        },
      },
    },
    {
      eventId: new Long(3),
      eventTime: new Long(800610625, 351737688, false),
      eventType: 'WorkflowTaskStarted',
      workflowTaskStartedEventAttributes: {
        identity: 'box1@ci-task-queue',
        requestId: 'fafa095d-b4ca-423a-a812-223e62b5ccf8',
        scheduledEventId: new Long(2),
      },
    },
  ],
  wfHistoryJson = [
    {
      eventId: 1,
      eventTime: '2017-11-14T23:24:10.351Z',
      eventType: 'WorkflowExecutionStarted',
      details: Object.assign(
        {},
        wfHistoryThrift[0].workflowExecutionStartedEventAttributes,
        {
          input: {
            emails: ['jane@example.com', 'bob@example.com'],
            includeFooter: true,
          },
        }
      ),
    },
    {
      eventId: 2,
      eventTime: '2017-11-14T23:24:10.351Z',
      eventType: 'WorkflowTaskScheduled',
      details: wfHistoryThrift[1].workflowTaskScheduledEventAttributes,
    },
    {
      eventId: 3,
      eventTime: '2017-11-14T23:24:27.531Z',
      eventType: 'WorkflowTaskStarted',
      details: {
        identity: 'box1@ci-task-queue',
        requestId: 'fafa095d-b4ca-423a-a812-223e62b5ccf8',
        scheduledEventId: 2,
      },
    },
  ];

describe('Workflow History', function() {
  it('should forward the request to the temporal frontend with workflowId and runId', function() {
    this.test.GetWorkflowExecutionHistory = ({ getRequest }) => {
      getRequest.should.deep.equal({
        HistoryEventFilterType: null,
        namespace: 'canary',
        execution: {
          workflowId: 'ci/demo',
          runId: 'run1',
        },
        maximumPageSize: 100,
        nextPageToken: null,
        skipArchival: null,
        waitForNewEvent: null,
      });

      return {
        history: { events: wfHistoryThrift },
        nextPageToken: new Buffer('page2'),
      };
    };

    return request()
      .get('/api/namespaces/canary/workflows/ci%2Fdemo/run1/history')
      .expect(200)
      .expect('Content-Type', /json/);
  });

  it('should forward the nextPageToken', function() {
    this.test.GetWorkflowExecutionHistory = ({ getRequest }) => {
      getRequest.nextPageToken.toString().should.equal('page2');

      return {
        history: { events: [] },
        nextPageToken: new Buffer('page3'),
      };
    };

    return request()
      .get(
        '/api/namespaces/canary/workflows/ci%2Fdemo/run1/history?nextPageToken=cGFnZTI%3D'
      )
      .expect(200)
      .expect('Content-Type', /json/)
      .expect({
        archived: null,
        history: { events: [] },
        nextPageToken: 'cGFnZTM=',
        rawHistory: null,
      });
  });

  it('should support long polling by forwarding the waitForNewEvent flag', function() {
    this.test.GetWorkflowExecutionHistory = ({ getRequest }) => {
      getRequest.waitForNewEvent.should.be.true;
      return { history: { events: [{ eventId: 1 }] } };
    };

    return request()
      .get(
        '/api/namespaces/canary/workflows/ci%2Fdemo/run1/history?waitForNewEvent=true'
      )
      .expect(200)
      .expect('Content-Type', /json/)
      .then(() =>
        request()
          .get(
            '/api/namespaces/canary/workflows/ci%2Fdemo/run1/history?waitForNewEvent'
          )
          .expect(200)
      );
  });

  it('should transform Long numbers to JavaScript numbers, Long dates to ISO date strings, and line-delimited JSON buffers to JSON', function() {
    this.test.GetWorkflowExecutionHistory = ({ getRequest }) => ({
      history: { events: wfHistoryThrift },
      nextPageToken: new Buffer('page2'),
    });

    return request()
      .get('/api/namespaces/canary/workflows/ci%2Fdemo/run1/history')
      .expect(200)
      .expect({
        archived: null,
        history: { events: wfHistoryJson },
        nextPageToken: 'cGFnZTI=',
        rawHistory: null,
      });
  });

  describe('Export', function() {
    const wfHistoryCliJson = `[{"eventId":1,"eventTime":"2020-07-30T00:30:03.082421843Z","eventType":"WorkflowExecutionStarted","workflowExecutionStartedEventAttributes":{"workflowType":{"name":"github.com/temporalio/temporal/demo"},"taskQueue":{"name":"ci-task-queue"},"input": {"payloads": [{"metadata": {"encoding": "anNvbi9wbGFpbg=="},"data": "IldvcmtmbG93MSI="}]},"executionStartToCloseTimeout":"1080s","taskStartToCloseTimeout":"30s"}},{"eventId":2,"eventTime":"2020-07-30T00:30:03.082421843Z","eventType":"WorkflowTaskScheduled","workflowTaskScheduledEventAttributes":{"taskQueue":{"name":"canary-task-queue"},"startToCloseTimeout":"180s","attempt":1}},{"eventId":3,"eventTime":"2020-07-30T00:30:03.082421843Z","eventType":"WorkflowTaskStarted","workflowTaskStartedEventAttributes":{"scheduledEventId":2,"identity":"box1@ci-task-queue","requestId":"fafa095d-b4ca-423a-a812-223e62b5ccf8"}}]`;

    it('should be able to export history in a format compatible with the CLI', function() {
      this.test.GetWorkflowExecutionHistory = ({ getRequest }) => ({
        history: { events: wfHistoryThrift },
      });

      return request()
        .get('/api/namespaces/canary/workflows/ci%2Fdemo/run1/export')
        .expect(200)
        .expect(wfHistoryCliJson);
    });

    it('should page through all responses', async function() {
      var calls = 0;
      this.test.GetWorkflowExecutionHistory = ({ getRequest }) => {
        if (calls > 0) {
          getRequest.nextPageToken.should.be.ok;
        } else {
          should.not.exist(getRequest.nextPageToken);
        }
        var resp = {
          history: { events: [wfHistoryThrift[calls]] },
        };
        if (++calls < wfHistoryThrift.length) {
          resp.nextPageToken = new Buffer('page' + calls);
        }
        return resp;
      };

      return request()
        .get('/api/namespaces/canary/workflows/ci%2Fdemo/run1/export')
        .expect(200)
        .expect(wfHistoryCliJson);
    });
  });
});
